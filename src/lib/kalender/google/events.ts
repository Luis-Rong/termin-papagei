import { randomUUID } from "node:crypto";

import { ZEITZONE } from "@/lib/zeit";

import type { KalenderTermin } from "../typen";

/**
 * Die Kalendereinträge selbst. Auch hier reines `fetch` gegen die REST-API von
 * Google (Begründung in `oauth.ts`).
 *
 * Der Vertriebspartner bekommt keinen zweiten, eigenen Eintrag, sondern steht
 * als Teilnehmer an diesem hier: Google legt den Termin dann in seinen
 * Kalender, Verschieben und Absagen wandern automatisch mit, und beide sehen
 * denselben Meet-Link. Zwei getrennte Einträge müsste man von Hand
 * synchronisieren — und der zweite bekäme nie denselben Link.
 */
const BASIS = "https://www.googleapis.com/calendar/v3/calendars";

/**
 * Google verschickt keine eigenen Einladungs-Mails: Der Kunde bekommt seine
 * Mail über Resend (Phase 6), der Partner sieht den Termin im Portal.
 */
const OHNE_GOOGLE_MAILS = "sendUpdates=none";

/** Nötig, sobald ein Meet-Link im Spiel ist. */
const MIT_KONFERENZ = "conferenceDataVersion=1";

type GoogleEvent = {
  id?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
  error?: { message?: string };
};

function eventUrl(calendarId: string, eventId?: string): string {
  const basis = `${BASIS}/${encodeURIComponent(calendarId)}/events`;
  return eventId ? `${basis}/${encodeURIComponent(eventId)}` : basis;
}

function alsIso(zeitpunkt: string | Date): string {
  return new Date(zeitpunkt).toISOString();
}

/**
 * Der Kalendereintrag, wie Google ihn erwartet.
 *
 * `attendees` wird immer mitgeschickt — auch leer. Sonst bliebe ein Partner,
 * der später vom Termin entfernt wurde, für immer im Kalender stehen.
 */
function eventKoerper(termin: KalenderTermin) {
  const koerper: Record<string, unknown> = {
    summary: termin.titel,
    description: termin.beschreibung ?? "",
    location: termin.ort ?? "",
    start: { dateTime: alsIso(termin.beginn), timeZone: ZEITZONE },
    end: { dateTime: alsIso(termin.ende), timeZone: ZEITZONE },
    attendees: (termin.teilnehmer ?? []).map((email) => ({ email })),
  };

  if (termin.digital && !termin.meetLink) {
    // Der Meet-Link entsteht beim Anlegen des Termins nebenbei.
    koerper.conferenceData = {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  if (!termin.digital) {
    // Aus digital wurde ein Termin im Büro: Konferenz wieder entfernen.
    koerper.conferenceData = null;
  }

  return koerper;
}

function meetLinkAus(event: GoogleEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink;

  const eintrag = event.conferenceData?.entryPoints?.find(
    (punkt) => punkt.entryPointType === "video",
  );
  return eintrag?.uri ?? null;
}

async function anfrage(
  accessToken: string,
  url: string,
  methode: "POST" | "PATCH" | "DELETE",
  koerper?: unknown,
): Promise<Response> {
  return fetch(url, {
    method: methode,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: koerper === undefined ? undefined : JSON.stringify(koerper),
    cache: "no-store",
  });
}

async function fehlerText(antwort: Response): Promise<string> {
  try {
    const daten = (await antwort.json()) as GoogleEvent;
    if (daten.error?.message) return daten.error.message;
  } catch {
    // Antwort ohne verwertbaren Inhalt — dann bleibt nur der Statuscode.
  }
  return `Google antwortete mit Status ${antwort.status}.`;
}

export type GespeicherterEintrag = { eventId: string; meetLink: string | null };

export async function eventAnlegen(
  accessToken: string,
  calendarId: string,
  termin: KalenderTermin,
): Promise<GespeicherterEintrag> {
  const antwort = await anfrage(
    accessToken,
    `${eventUrl(calendarId)}?${MIT_KONFERENZ}&${OHNE_GOOGLE_MAILS}`,
    "POST",
    eventKoerper(termin),
  );

  if (!antwort.ok) throw new Error(await fehlerText(antwort));

  const event = (await antwort.json()) as GoogleEvent;
  if (!event.id) throw new Error("Google hat keinen Termin zurückgegeben.");

  return {
    eventId: event.id,
    meetLink: termin.digital
      ? (meetLinkAus(event) ?? (await meetLinkNachreichen(accessToken, calendarId, event.id)))
      : null,
  };
}

/**
 * Aktualisiert einen bestehenden Eintrag. Gibt null zurück, wenn es ihn bei
 * Google nicht mehr gibt — dann wurde er dort von Hand gelöscht und die
 * aufrufende Stelle legt ihn einfach neu an.
 */
export async function eventAktualisieren(
  accessToken: string,
  calendarId: string,
  eventId: string,
  termin: KalenderTermin,
): Promise<GespeicherterEintrag | null> {
  const antwort = await anfrage(
    accessToken,
    `${eventUrl(calendarId, eventId)}?${MIT_KONFERENZ}&${OHNE_GOOGLE_MAILS}`,
    "PATCH",
    eventKoerper(termin),
  );

  if (antwort.status === 404 || antwort.status === 410) return null;
  if (!antwort.ok) throw new Error(await fehlerText(antwort));

  const event = (await antwort.json()) as GoogleEvent;

  return {
    eventId: event.id ?? eventId,
    meetLink: termin.digital ? meetLinkAus(event) : null,
  };
}

/** Ein bereits gelöschter Eintrag gilt als erledigt, nicht als Fehler. */
export async function eventLoeschen(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const antwort = await anfrage(
    accessToken,
    `${eventUrl(calendarId, eventId)}?${OHNE_GOOGLE_MAILS}`,
    "DELETE",
  );

  if (antwort.ok || antwort.status === 404 || antwort.status === 410) return;
  throw new Error(await fehlerText(antwort));
}

/**
 * Google erzeugt die Meet-Konferenz manchmal erst kurz nach dem Termin selbst.
 * Dann steht im Anlege-Ergebnis noch kein Link — ein einzelner zweiter Blick
 * genügt in aller Regel. Klappt auch der nicht, bleibt der Link leer und lässt
 * sich später durch Speichern des Termins nachholen.
 */
async function meetLinkNachreichen(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<string | null> {
  try {
    const antwort = await fetch(eventUrl(calendarId, eventId), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!antwort.ok) return null;

    return meetLinkAus((await antwort.json()) as GoogleEvent);
  } catch {
    return null;
  }
}
