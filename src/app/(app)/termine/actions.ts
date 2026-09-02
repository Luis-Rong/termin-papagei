"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormularStatus } from "@/app/(auth)/actions";
import {
  kalenderHinweis,
  partnerGoogleAdresse,
  terminAbsagen,
  terminEintragen,
  verbindungLaden,
} from "@/lib/kalender";
import { istBestaetigterPartner, istUuid } from "@/lib/partner/abfragen";
import { OHNE_PARTNER } from "@/lib/partner/typen";
import { createClient } from "@/lib/supabase/server";
import {
  ERINNERUNG_STUNDEN_MAX,
  istOrt,
  istStatus,
  istTerminart,
  ORTE,
  TERMINARTEN,
  terminartLabel,
} from "@/lib/termine/terminarten";
import {
  eingabeAlsZeitpunkt,
  fuegeZeitpunktZusammen,
  plusMinuten,
} from "@/lib/zeit";

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/**
 * Server Actions sind auch per direktem POST erreichbar — deshalb wird in jeder
 * Aktion erneut geprüft, wer angemeldet ist. Zusätzlich schützt die Row Level
 * Security in Supabase fremde Datensätze.
 */
async function angemeldeterNutzer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

const NICHT_ANGEMELDET =
  "Du bist nicht mehr angemeldet. Bitte melde dich erneut an.";

function seitenAktualisieren() {
  revalidatePath("/termine");
  revalidatePath("/dashboard");
}

/** Alle Formularfelder zurück ins Formular, damit nichts neu getippt werden muss. */
function werteVon(formData: FormData): Record<string, string> {
  const felder = [
    "kunde",
    "terminart",
    "ort",
    "datum",
    "uhrzeit",
    "dauer",
    "partner",
    "notizen",
    "vorbereitungDatum",
    "vorbereitungUhrzeit",
    "vorbereitungDauer",
    "erinnerung1TagAktiv",
    "erinnerung1TagStunden",
    "erinnerung2StdAktiv",
    "erinnerung2StdStunden",
  ];
  return Object.fromEntries(felder.map((feld) => [feld, text(formData, feld)]));
}

/** Datum und Uhrzeit stehen im Formular getrennt und gehören wieder zusammen. */
function zeitpunktAus(formData: FormData, praefix = ""): string {
  const [datum, uhrzeit] = praefix
    ? [`${praefix}Datum`, `${praefix}Uhrzeit`]
    : ["datum", "uhrzeit"];
  return fuegeZeitpunktZusammen(text(formData, datum), text(formData, uhrzeit));
}

/** Beginn und Dauer aus dem Formular als echter Zeitraum. */
function zeitraum(
  beginnEingabe: string,
  dauerEingabe: string,
): { beginn: Date; ende: Date } | { fehler: string } {
  const beginn = eingabeAlsZeitpunkt(beginnEingabe);
  if (!beginn) return { fehler: "Bitte Datum und Uhrzeit angeben." };

  const dauer = Number(dauerEingabe);
  if (!Number.isFinite(dauer) || dauer <= 0 || dauer > 24 * 60) {
    return { fehler: "Die Dauer sieht nicht richtig aus." };
  }

  return { beginn, ende: plusMinuten(beginn, dauer) };
}

/**
 * Prüft den beteiligten Vertriebspartner. Der Partner sieht den Termin
 * anschließend in seiner Liste — deshalb muss die Partnerschaft bestätigt sein.
 */
async function partnerPruefen(
  userId: string,
  auswahl: string,
): Promise<{ id: string | null } | { fehler: string }> {
  if (!auswahl || auswahl === OHNE_PARTNER) return { id: null };

  if (!(await istBestaetigterPartner(userId, auswahl))) {
    return {
      fehler:
        "Dieser Vertriebspartner ist nicht mit dir verbunden. Bitte wähle einen bestätigten Partner aus.",
    };
  }
  return { id: auswahl };
}

/**
 * Die beiden Kunden-Erinnerungen: aktiv per Checkbox (Radix-Checkbox schickt
 * bei Häkchen "on", sonst fehlt das Feld im FormData — wie ein natives
 * Checkbox-Feld), Vorlauf als Stundenzahl innerhalb der DB-Check-Constraint.
 */
function erinnerungenPruefen(
  formData: FormData,
):
  | {
      erinnerung_1tag_aktiv: boolean;
      erinnerung_1tag_stunden_vorher: number;
      erinnerung_2std_aktiv: boolean;
      erinnerung_2std_stunden_vorher: number;
    }
  | { fehler: string } {
  function stundenPruefen(
    feld: string,
    bezeichnung: string,
  ): { stunden: number } | { fehler: string } {
    const stunden = Number(text(formData, feld));
    if (!Number.isInteger(stunden) || stunden <= 0 || stunden > ERINNERUNG_STUNDEN_MAX) {
      return { fehler: `Der Vorlauf der Erinnerung „${bezeichnung}" sieht nicht richtig aus.` };
    }
    return { stunden };
  }

  const einTag = stundenPruefen("erinnerung1TagStunden", "1 Tag vorher");
  if ("fehler" in einTag) return { fehler: einTag.fehler };

  const zweiStd = stundenPruefen("erinnerung2StdStunden", "2 Std vorher");
  if ("fehler" in zweiStd) return { fehler: zweiStd.fehler };

  return {
    erinnerung_1tag_aktiv: formData.get("erinnerung1TagAktiv") === "on",
    erinnerung_1tag_stunden_vorher: einTag.stunden,
    erinnerung_2std_aktiv: formData.get("erinnerung2StdAktiv") === "on",
    erinnerung_2std_stunden_vorher: zweiStd.stunden,
  };
}

/** Gemeinsame Prüfung für Anlegen und Speichern eines Kundentermins. */
async function terminPruefen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData,
) {
  const kundeId = text(formData, "kunde");
  const terminart = text(formData, "terminart");
  const ort = text(formData, "ort");

  if (!istUuid(kundeId)) return { fehler: "Bitte einen Kunden auswählen." };
  if (!istTerminart(terminart)) return { fehler: "Bitte eine Terminart auswählen." };
  if (!istOrt(ort)) return { fehler: "Bitte auswählen, ob der Termin im Büro oder digital stattfindet." };

  // Ohne diese Prüfung könnte man per direktem POST einen Termin auf einen
  // fremden Kunden legen — die Termin-Policy prüft nur den Besitzer.
  const { data: kunde } = await supabase
    .from("customers")
    .select("id")
    .eq("id", kundeId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!kunde) return { fehler: "Dieser Kunde gehört nicht zu deinem Portal." };

  const zeit = zeitraum(zeitpunktAus(formData), text(formData, "dauer"));
  if ("fehler" in zeit) return { fehler: zeit.fehler };

  const partner = await partnerPruefen(userId, text(formData, "partner"));
  if ("fehler" in partner) return { fehler: partner.fehler };

  const erinnerungen = erinnerungenPruefen(formData);
  if ("fehler" in erinnerungen) return { fehler: erinnerungen.fehler };

  return {
    datensatz: {
      kind: "kundentermin" as const,
      customer_id: kundeId,
      appointment_type: terminart,
      location: ort,
      starts_at: zeit.beginn.toISOString(),
      ends_at: zeit.ende.toISOString(),
      notes: text(formData, "notizen") || null,
      partner_id: partner.id,
      ...erinnerungen,
    },
  };
}

/* --------------------------------------------------------------------------
 * Google-Kalender
 *
 * Der Termin steht immer schon in der Datenbank, wenn der Kalender an die
 * Reihe kommt. Deshalb bricht hier nichts ab: Ist kein Kalender verbunden oder
 * meldet Google einen Fehler, bleibt der Termin trotzdem bestehen und die
 * Terminseite zeigt an, dass er (noch) nicht im Kalender steht.
 * ----------------------------------------------------------------------- */

const KALENDER_FELDER =
  "id, kind, customer_id, partner_id, parent_appointment_id, appointment_type, location, starts_at, ends_at, notes, status, google_event_id, meet_link";

type KalenderZeile = {
  id: string;
  kind: "kundentermin" | "vorbereitung";
  customer_id: string | null;
  partner_id: string | null;
  parent_appointment_id: string | null;
  appointment_type: string | null;
  location: "buero" | "digital";
  starts_at: string;
  ends_at: string;
  notes: string | null;
  status: string;
  google_event_id: string | null;
  meet_link: string | null;
};

/**
 * Der Name des Kunden — beim Vorbereitungstermin der des zugehörigen
 * Beratungstermins, denn im Kalender nützt "Vorbereitung" allein wenig.
 */
async function kundenNameFuer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  zeile: KalenderZeile,
): Promise<string | null> {
  let kundeId = zeile.customer_id;

  if (!kundeId && zeile.parent_appointment_id) {
    const { data: eltern } = await supabase
      .from("appointments")
      .select("customer_id")
      .eq("id", zeile.parent_appointment_id)
      .maybeSingle();
    kundeId = eltern?.customer_id ?? null;
  }

  if (!kundeId) return null;

  const { data: kunde } = await supabase
    .from("customers")
    .select("first_name, last_name")
    .eq("id", kundeId)
    .maybeSingle();

  return kunde ? `${kunde.first_name} ${kunde.last_name}`.trim() : null;
}

function kalenderTitel(zeile: KalenderZeile, kundenName: string | null): string {
  const kern =
    zeile.kind === "vorbereitung"
      ? kundenName
        ? `Vorbereitung — ${kundenName}`
        : "Vorbereitungstermin"
      : [terminartLabel(zeile.appointment_type ?? ""), kundenName]
          .filter(Boolean)
          .join(" — ");

  // Ein abgesagter Termin bleibt im Kalender stehen, aber sichtbar abgesagt.
  return zeile.status === "abgesagt" ? `Abgesagt: ${kern}` : kern;
}

type Abgleich = { hinweis: string | null; eingetragen: boolean };

const OHNE_ABGLEICH: Abgleich = { hinweis: null, eingetragen: false };

/**
 * Ein Termin im Büro darf keinen Meet-Link behalten — auch dann nicht, wenn
 * der Kalender gerade nicht erreichbar ist und ihn dort niemand entfernt.
 */
async function meetLinkAufraeumen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  zeile: KalenderZeile,
): Promise<void> {
  if (zeile.location === "digital" || !zeile.meet_link) return;

  await supabase
    .from("appointments")
    .update({ meet_link: null })
    .eq("id", zeile.id)
    .eq("owner_id", userId);
}

/**
 * Bringt den Google-Kalender auf den Stand der Datenbank: Eintrag anlegen oder
 * aktualisieren, Meet-Link zurückschreiben. Wirft nie.
 */
async function kalenderAbgleich(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  terminId: string,
): Promise<Abgleich> {
  const { data } = await supabase
    .from("appointments")
    .select(KALENDER_FELDER)
    .eq("id", terminId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!data) return OHNE_ABGLEICH;
  const zeile = data as KalenderZeile;

  // Ohne verbundenen Kalender ist hier Schluss: keine weiteren Abfragen, kein
  // Aufruf bei Google. Das ist der Normalfall für alle, die die Verbindung
  // bewusst nicht einrichten.
  if (!(await verbindungLaden(userId))) {
    await meetLinkAufraeumen(supabase, userId, zeile);
    return OHNE_ABGLEICH;
  }

  const [kundenName, partnerAdresse] = await Promise.all([
    kundenNameFuer(supabase, zeile),
    // Der Partner sitzt beim Termin mit am Tisch: Als Teilnehmer landet der
    // Termin auch in seinem Kalender — mit demselben Meet-Link.
    zeile.partner_id ? partnerGoogleAdresse(zeile.partner_id) : null,
  ]);

  const ergebnis = await terminEintragen(userId, {
    eventId: zeile.google_event_id,
    titel: kalenderTitel(zeile, kundenName),
    beschreibung: zeile.notes,
    beginn: zeile.starts_at,
    ende: zeile.ends_at,
    digital: zeile.location === "digital",
    ort: zeile.location === "buero" ? ORTE.buero : null,
    teilnehmer: partnerAdresse ? [partnerAdresse] : [],
    meetLink: zeile.meet_link,
  });

  if (ergebnis.status === "ok") {
    await supabase
      .from("appointments")
      .update({
        google_event_id: ergebnis.eventId,
        meet_link: ergebnis.meetLink,
      })
      .eq("id", terminId)
      .eq("owner_id", userId);
  } else {
    await meetLinkAufraeumen(supabase, userId, zeile);
  }

  return {
    hinweis: kalenderHinweis(ergebnis),
    eingetragen: ergebnis.status === "ok",
  };
}

/** Kombiniert die Rückmeldung einer Aktion mit der des Kalenders. */
function mitKalenderHinweis(
  erfolg: string,
  abgleich: Abgleich,
): FormularStatus {
  // Der Hinweis meldet einen Kalenderfehler und sagt selbst dazu, dass der
  // Termin gespeichert ist — deshalb steht er im Feld `fehler`.
  return abgleich.hinweis ? { fehler: abgleich.hinweis } : { hinweis: erfolg };
}

export async function terminAnlegen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const werte = werteVon(formData);

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const geprueft = await terminPruefen(supabase, user.id, formData);
  if ("fehler" in geprueft) return { fehler: geprueft.fehler, werte };

  const { data: termin, error } = await supabase
    .from("appointments")
    .insert({ ...geprueft.datensatz, owner_id: user.id })
    .select("id")
    .single();

  if (error) return { fehler: `Anlegen fehlgeschlagen: ${error.message}`, werte };

  // Ab hier steht der Termin. Ob er auch im Kalender landet, zeigt die
  // Terminseite an — dorthin geht es am Ende dieser Aktion ohnehin.
  await kalenderAbgleich(supabase, user.id, termin.id);

  // Bei einer Beratung kann direkt der Vorbereitungstermin mit angelegt werden.
  // Halb ausgefüllt zählt nicht — sonst entsteht stillschweigend keiner.
  const vorbereitungDatum = text(formData, "vorbereitungDatum");
  const vorbereitungUhrzeit = text(formData, "vorbereitungUhrzeit");

  if (Boolean(vorbereitungDatum) !== Boolean(vorbereitungUhrzeit)) {
    seitenAktualisieren();
    return {
      fehler:
        "Der Termin wurde angelegt. Für den Vorbereitungstermin fehlt noch Datum oder Uhrzeit — du kannst ihn auf der Terminseite nachtragen.",
      werte,
    };
  }

  if (vorbereitungDatum) {
    const vorbereitung = await vorbereitungEinfuegen(
      supabase,
      user.id,
      termin.id,
      zeitpunktAus(formData, "vorbereitung"),
      text(formData, "vorbereitungDauer"),
      geprueft.datensatz.partner_id,
    );

    if ("fehler" in vorbereitung) {
      // Der Kundentermin steht schon — der Vorbereitungstermin lässt sich auf
      // der Terminseite nachholen, deshalb hier kein Abbruch.
      seitenAktualisieren();
      return {
        fehler: `Der Termin wurde angelegt, aber der Vorbereitungstermin nicht: ${vorbereitung.fehler}`,
        werte,
      };
    }

    await kalenderAbgleich(supabase, user.id, vorbereitung.id);
  }

  seitenAktualisieren();
  redirect(`/termine/${termin.id}`);
}

export async function terminSpeichern(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const werte = werteVon(formData);
  const id = text(formData, "id");
  if (!istUuid(id)) {
    return { fehler: "Der Termin konnte nicht zugeordnet werden.", werte };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const geprueft = await terminPruefen(supabase, user.id, formData);
  if ("fehler" in geprueft) return { fehler: geprueft.fehler, werte };

  const { error } = await supabase
    .from("appointments")
    .update(geprueft.datensatz)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}`, werte };

  const abgleich = await kalenderAbgleich(supabase, user.id, id);

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return mitKalenderHinweis("Änderungen gespeichert.", abgleich);
}

/** Legt einen Vorbereitungstermin an und gibt dessen Id zurück. */
async function vorbereitungEinfuegen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  elternId: string,
  beginnEingabe: string,
  dauerEingabe: string,
  partnerId: string | null,
): Promise<{ id: string } | { fehler: string }> {
  const zeit = zeitraum(
    beginnEingabe,
    dauerEingabe || String(TERMINARTEN.beratung.dauerMinuten),
  );
  if ("fehler" in zeit) return { fehler: zeit.fehler };

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      owner_id: userId,
      kind: "vorbereitung",
      parent_appointment_id: elternId,
      partner_id: partnerId,
      location: "buero",
      starts_at: zeit.beginn.toISOString(),
      ends_at: zeit.ende.toISOString(),
    })
    .select("id")
    .single();

  return error ? { fehler: error.message } : { id: data.id };
}

/** Vorbereitungstermin nachträglich von der Terminseite aus anlegen. */
export async function vorbereitungAnlegen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const elternId = text(formData, "id");
  if (!istUuid(elternId)) {
    return { fehler: "Der Termin konnte nicht zugeordnet werden." };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  // Nur zum eigenen Termin, und der Partner wird vom Haupttermin übernommen.
  const { data: eltern } = await supabase
    .from("appointments")
    .select("id, partner_id")
    .eq("id", elternId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!eltern) return { fehler: "Dieser Termin gehört nicht zu deinem Portal." };

  const vorbereitung = await vorbereitungEinfuegen(
    supabase,
    user.id,
    elternId,
    zeitpunktAus(formData),
    text(formData, "dauer"),
    eltern.partner_id,
  );
  if ("fehler" in vorbereitung) {
    return { fehler: `Anlegen fehlgeschlagen: ${vorbereitung.fehler}` };
  }

  const abgleich = await kalenderAbgleich(supabase, user.id, vorbereitung.id);

  seitenAktualisieren();
  revalidatePath(`/termine/${elternId}`);
  return mitKalenderHinweis("Vorbereitungstermin angelegt.", abgleich);
}

/** Vorbereitungstermin verschieben oder mit einer Notiz versehen. */
export async function vorbereitungBearbeiten(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) {
    return { fehler: "Der Termin konnte nicht zugeordnet werden." };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const zeit = zeitraum(zeitpunktAus(formData), text(formData, "dauer"));
  if ("fehler" in zeit) return { fehler: zeit.fehler };

  const { error } = await supabase
    .from("appointments")
    .update({
      starts_at: zeit.beginn.toISOString(),
      ends_at: zeit.ende.toISOString(),
      notes: text(formData, "notizen") || null,
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("kind", "vorbereitung");

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}` };

  const abgleich = await kalenderAbgleich(supabase, user.id, id);

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return mitKalenderHinweis("Änderungen gespeichert.", abgleich);
}

export async function statusSetzen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  const neuerStatus = text(formData, "status");

  if (!istUuid(id)) return { fehler: "Der Termin konnte nicht zugeordnet werden." };
  if (!istStatus(neuerStatus)) return { fehler: "Unbekannter Status." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  // Für den Kalender zählt nur, ob der Termin abgesagt ist oder nicht —
  // "wahrgenommen" ändert dort nichts und spart sich den Aufruf bei Google.
  const { data: vorher } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("appointments")
    .update({ status: neuerStatus })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}` };

  // Ein abgesagter Termin verschwindet nicht aus dem Kalender, sondern heißt
  // dort ab jetzt "Abgesagt: …" — so bleibt sichtbar, was ausgefallen ist.
  const abgesagtVorher = vorher?.status === "abgesagt";
  const abgleich =
    abgesagtVorher === (neuerStatus === "abgesagt")
      ? OHNE_ABGLEICH
      : await kalenderAbgleich(supabase, user.id, id);

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return abgleich.hinweis ? { fehler: abgleich.hinweis } : {};
}

/**
 * Einen Termin nachträglich in den Kalender eintragen — für den Fall, dass
 * beim Anlegen noch keine Verbindung bestand oder Google gerade streikte.
 */
export async function kalenderNachtragen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) return { fehler: "Der Termin konnte nicht zugeordnet werden." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const abgleich = await kalenderAbgleich(supabase, user.id, id);

  if (abgleich.hinweis) return { fehler: abgleich.hinweis };
  if (!abgleich.eingetragen) {
    return {
      fehler:
        "Es ist kein Google-Kalender verbunden. Du kannst ihn in den Einstellungen verbinden.",
    };
  }

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return { hinweis: "Der Termin steht jetzt in deinem Google-Kalender." };
}

export async function terminLoeschen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) return { fehler: "Der Termin konnte nicht zugeordnet werden." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  // Was aus dem Kalender muss, vor dem Löschen merken: Danach steht es
  // nirgends mehr. Der Vorbereitungstermin hängt mit dran — in der Datenbank
  // verschwindet er automatisch (on delete cascade), im Kalender nicht.
  const { data: betroffen } = await supabase
    .from("appointments")
    .select("google_event_id")
    .eq("owner_id", user.id)
    .or(`id.eq.${id},parent_appointment_id.eq.${id}`);

  const eventIds = (betroffen ?? [])
    .map((zeile) => zeile.google_event_id as string | null)
    .filter((eventId): eventId is string => Boolean(eventId));

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { fehler: `Löschen fehlgeschlagen: ${error.message}` };

  let kalenderRest = false;
  for (const eventId of eventIds) {
    const ergebnis = await terminAbsagen(user.id, eventId);
    if (ergebnis.status === "fehler" || ergebnis.status === "getrennt") {
      kalenderRest = true;
    }
  }

  seitenAktualisieren();
  // Der Termin ist weg — die Seite dazu gibt es nicht mehr. Ein Rest im
  // Kalender wird deshalb auf der Terminliste gemeldet.
  redirect(kalenderRest ? "/termine?kalender=rest" : "/termine");
}
