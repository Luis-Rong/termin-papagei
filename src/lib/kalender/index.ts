/**
 * Der Kalender, wie die Anwendung ihn sieht: Termin eintragen, Termin absagen,
 * Verbindung herstellen und trennen. Dass dahinter Google steckt, steht
 * ausschließlich in `google/` — außerhalb von `src/lib/kalender/` taucht weder
 * ein Google-Aufruf noch ein Refresh-Token auf.
 *
 * Grundregel für alle Funktionen hier: Sie werfen nie. Ein Termin ist immer
 * schon gespeichert, wenn der Kalender an der Reihe ist, und darf nie daran
 * scheitern, dass Google gerade nicht mag oder gar nicht verbunden ist.
 */

import {
  eventAktualisieren,
  eventAnlegen,
  eventLoeschen,
} from "./google/events";
import {
  anmeldeUrl,
  googleEingerichtet,
  rueckkehrAdresse,
  verbindungAusCode,
  verbindungZurueckziehen,
  zugriffsToken,
} from "./google/oauth";
import type { KalenderAbsage, KalenderErgebnis, KalenderTermin } from "./typen";
import {
  partnerGoogleAdresse,
  verbindungLaden,
  verbindungLoeschen,
  verbindungMitToken,
  verbindungSpeichern,
} from "./verbindung";

export type { Kalenderverbindung } from "./verbindung";
export type { KalenderAbsage, KalenderErgebnis, KalenderTermin } from "./typen";
export { kalenderHinweis } from "./typen";
export { partnerGoogleAdresse, verbindungLaden };

/** Sind überhaupt Zugangsdaten hinterlegt? Ohne sie bleibt die Kalenderfunktion aus. */
export function kalenderEingerichtet(): boolean {
  return googleEingerichtet();
}

function meldung(fehler: unknown): string {
  return fehler instanceof Error ? fehler.message : "Unbekannter Fehler.";
}

/**
 * Holt einen frischen Zugriffs-Token. Ist der Zugang bei Google entzogen
 * worden, wird die Verbindung hier gleich entfernt — sonst würde jeder weitere
 * Termin dieselbe tote Verbindung anfassen.
 */
async function zugang(
  userId: string,
): Promise<
  | { accessToken: string; calendarId: string }
  | { status: "nicht_verbunden" | "getrennt" }
  | { status: "fehler"; meldung: string }
> {
  const verbindung = await verbindungMitToken(userId);
  if (!verbindung) return { status: "nicht_verbunden" };

  const token = await zugriffsToken(verbindung.refreshToken);

  if ("fehler" in token) {
    if (token.entzogen) {
      await verbindungLoeschen(userId);
      return { status: "getrennt" };
    }
    return { status: "fehler", meldung: token.fehler };
  }

  return { accessToken: token.accessToken, calendarId: verbindung.calendarId };
}

/**
 * Trägt einen Termin in den Kalender ein oder bringt einen bestehenden Eintrag
 * auf Stand. Bei digitalen Terminen entsteht dabei der Meet-Link.
 */
export async function terminEintragen(
  userId: string,
  termin: KalenderTermin,
): Promise<KalenderErgebnis> {
  try {
    const offen = await zugang(userId);
    if ("status" in offen) return offen;

    let eintrag = termin.eventId
      ? await eventAktualisieren(
          offen.accessToken,
          offen.calendarId,
          termin.eventId,
          termin,
        )
      : null;

    // Kein Eintrag: entweder noch nie einer angelegt oder bei Google von Hand
    // gelöscht. Beides endet hier mit einem neuen — inklusive neuem Meet-Link.
    eintrag ??= await eventAnlegen(offen.accessToken, offen.calendarId, {
      ...termin,
      eventId: null,
      meetLink: null,
    });

    return { status: "ok", eventId: eintrag.eventId, meetLink: eintrag.meetLink };
  } catch (fehler) {
    return { status: "fehler", meldung: meldung(fehler) };
  }
}

/** Nimmt einen Termin wieder aus dem Kalender — beim Löschen oder Absagen. */
export async function terminAbsagen(
  userId: string,
  eventId: string,
): Promise<KalenderAbsage> {
  try {
    const offen = await zugang(userId);
    if ("status" in offen) return offen;

    await eventLoeschen(offen.accessToken, offen.calendarId, eventId);
    return { status: "ok" };
  } catch (fehler) {
    return { status: "fehler", meldung: meldung(fehler) };
  }
}

/**
 * Erster Schritt beim Verbinden: die Adresse, zu der der Nutzer geschickt wird.
 * `state` schützt vor untergeschobenen Rückläufern (siehe /google/verbinden).
 */
export function verbindungStarten(
  origin: string,
  state: string,
): { url: string } | { fehler: string } {
  try {
    return { url: anmeldeUrl(rueckkehrAdresse(origin), state) };
  } catch (fehler) {
    return { fehler: meldung(fehler) };
  }
}

/** Zweiter Schritt: den Code von Google gegen den dauerhaften Zugang tauschen und speichern. */
export async function verbindungAbschliessen(
  userId: string,
  code: string,
  origin: string,
): Promise<{ googleEmail: string } | { fehler: string }> {
  try {
    const neu = await verbindungAusCode(code, rueckkehrAdresse(origin));
    if ("fehler" in neu) return neu;

    const fehler = await verbindungSpeichern(userId, neu);
    if (fehler) return { fehler };

    return { googleEmail: neu.googleEmail };
  } catch (fehler) {
    return { fehler: meldung(fehler) };
  }
}

/**
 * Trennen heißt: bei Google abmelden und den Token bei uns löschen. Bereits
 * eingetragene Termine bleiben im Kalender stehen — sie gehören dem Nutzer.
 */
export async function verbindungTrennen(userId: string): Promise<string | null> {
  try {
    const verbindung = await verbindungMitToken(userId);
    if (verbindung) await verbindungZurueckziehen(verbindung.refreshToken);
  } catch {
    // Ein nicht mehr lesbarer Token lässt sich nicht zurückziehen — gelöscht
    // wird er trotzdem, sonst hinge die Verbindung für immer fest.
  }

  return verbindungLoeschen(userId);
}
