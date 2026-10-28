"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormularStatus } from "@/app/(auth)/actions";
import { mailVersenden } from "@/lib/email";
import { anfrageHerkunft } from "@/lib/herkunft";
import { mailHtmlSaeubern } from "@/lib/html-sicherheit";
import {
  kalenderHinweis,
  partnerGoogleAdresse,
  terminAbsagen,
  terminEintragen,
  verbindungLaden,
} from "@/lib/kalender";
import {
  kundenDatensatz,
  kundenName,
  kundenPruefen,
  kundenWerteLesen,
} from "@/lib/kunden/formular";
import { hinweisEinarbeiten } from "@/lib/llm";
import { istBestaetigterPartner, istUuid } from "@/lib/partner/abfragen";
import { OHNE_PARTNER } from "@/lib/partner/typen";
import { createClient } from "@/lib/supabase/server";
import {
  adresseZusammen,
  ERINNERUNG_STUNDEN_MAX,
  ERINNERUNG_TAGE_MAX,
  ERINNERUNGEN_MAX,
  istErinnerungsModus,
  istOrt,
  istStatus,
  istTerminart,
  NUTZEN_MAX,
  NUTZEN_ZEICHEN_MAX,
  ORTE,
  TERMINARTEN,
  terminartLabel,
  type Ort,
} from "@/lib/termine/terminarten";
import {
  absenderName,
  beraterName,
  bestaetigungBetreff,
  mailMitSignatur,
  mitMeetLink,
  platzhalterWerte,
  type MailKunde,
} from "@/lib/termine/mail";
import type { Anrede, AnredeTitel } from "@/lib/vorlagen/typen";
import { kundenAktionenHtml, oeffentlicheBasis } from "@/lib/termine/kundenlinks";
import { platzhalterErsetzen, vorlageLaden } from "@/lib/vorlagen/abfragen";
import {
  eingabeAlsZeitpunkt,
  fuegeZeitpunktZusammen,
  plusMinuten,
  UHRZEIT_MUSTER,
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
    "kundeModus",
    "neuVorname",
    "neuNachname",
    "neuEmail",
    "neuTelefon",
    "neuAnrede",
    "neuAnredeTitel",
    "terminart",
    "ort",
    "ortStrasse",
    "ortPlzOrt",
    "datum",
    "uhrzeit",
    "dauer",
    "partner",
    "notizen",
    "vorbereitungDatum",
    "vorbereitungUhrzeit",
    "vorbereitungDauer",
    "erinnerung1Aktiv",
    "erinnerung1Modus",
    "erinnerung1Stunden",
    "erinnerung1Tage",
    "erinnerung1Uhrzeit",
    "erinnerung2Aktiv",
    "erinnerung2Modus",
    "erinnerung2Stunden",
    "erinnerung2Tage",
    "erinnerung2Uhrzeit",
    "erinnerung3Aktiv",
    "erinnerung3Modus",
    "erinnerung3Stunden",
    "erinnerung3Tage",
    "erinnerung3Uhrzeit",
    "erinnerung4Aktiv",
    "erinnerung4Modus",
    "erinnerung4Stunden",
    "erinnerung4Tage",
    "erinnerung4Uhrzeit",
    "erinnerung5Aktiv",
    "erinnerung5Modus",
    "erinnerung5Stunden",
    "erinnerung5Tage",
    "erinnerung5Uhrzeit",
    "sofortSenden",
  ];
  const werte = Object.fromEntries(felder.map((feld) => [feld, text(formData, feld)]));
  werte.nutzen = nutzenAus(formData).join("\n");
  return werte;
}

/** Die gewählten Nutzen in ihrer Reihenfolge — höchstens drei, ohne Leere und Doppelte. */
function nutzenAus(formData: FormData): string[] {
  const liste: string[] = [];
  for (const eintrag of formData.getAll("nutzen")) {
    const wert = String(eintrag).trim().slice(0, NUTZEN_ZEICHEN_MAX);
    if (wert && !liste.includes(wert)) liste.push(wert);
  }
  return liste.slice(0, NUTZEN_MAX);
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

type ErinnerungsSpalten = {
  aktiv: boolean;
  stunden_vorher: number;
  modus: "vorlauf" | "uhrzeit";
  tage_vorher: number;
  uhrzeit: string;
};

/**
 * Eine Kunden-Erinnerung aus dem Formular: aktiv per Kästchen (schickt "on"),
 * dazu Modus und je nach Modus der Vorlauf in Stunden oder Tag und Uhrzeit —
 * alles innerhalb der DB-Check-Constraints.
 */
function erinnerungPruefen(
  formData: FormData,
  nummer: number,
): ErinnerungsSpalten | { fehler: string } {
  const feld = (name: string) => text(formData, `erinnerung${nummer}${name}`);
  const modus = feld("Modus") || "vorlauf";
  if (!istErinnerungsModus(modus)) {
    return { fehler: `Die ${nummer}. Erinnerung sieht nicht richtig aus.` };
  }

  const stunden = Number(feld("Stunden") || 1);
  if (!Number.isInteger(stunden) || stunden <= 0 || stunden > ERINNERUNG_STUNDEN_MAX) {
    return { fehler: `Der Vorlauf der ${nummer}. Erinnerung sieht nicht richtig aus.` };
  }

  const tage = Number(feld("Tage") || 0);
  if (!Number.isInteger(tage) || tage < 0 || tage > ERINNERUNG_TAGE_MAX) {
    return { fehler: `Der Tag der ${nummer}. Erinnerung sieht nicht richtig aus.` };
  }

  const uhrzeit = feld("Uhrzeit") || "09:00";
  if (!UHRZEIT_MUSTER.test(uhrzeit)) {
    return { fehler: `Die Uhrzeit der ${nummer}. Erinnerung sieht nicht richtig aus.` };
  }

  return {
    aktiv: formData.get(`erinnerung${nummer}Aktiv`) === "on",
    stunden_vorher: stunden,
    modus,
    tage_vorher: tage,
    uhrzeit,
  };
}

/**
 * Erinnerung 1 und 2 landen in ihren Spalten, 3 bis 5 (nur wenn das Formular
 * sie mitschickt — erkennbar am Feld `erinnerung<N>Modus`) in `erinnerungen_weitere`.
 */
function erinnerungenPruefen(formData: FormData) {
  const erste = erinnerungPruefen(formData, 1);
  if ("fehler" in erste) return erste;
  const zweite = erinnerungPruefen(formData, 2);
  if ("fehler" in zweite) return zweite;

  const weitere: ErinnerungsSpalten[] = [];
  for (let nummer = 3; nummer <= ERINNERUNGEN_MAX; nummer += 1) {
    if (!formData.has(`erinnerung${nummer}Modus`)) continue;
    const eintrag = erinnerungPruefen(formData, nummer);
    if ("fehler" in eintrag) return eintrag;
    weitere.push(eintrag);
  }

  return {
    erinnerungen_weitere: weitere.map((e) => ({
      aktiv: e.aktiv,
      modus: e.modus,
      stunden: e.stunden_vorher,
      tage: e.tage_vorher,
      uhrzeit: e.uhrzeit,
    })),
    erinnerung_1tag_aktiv: erste.aktiv,
    erinnerung_1tag_stunden_vorher: erste.stunden_vorher,
    erinnerung_1tag_modus: erste.modus,
    erinnerung_1tag_tage_vorher: erste.tage_vorher,
    erinnerung_1tag_uhrzeit: erste.uhrzeit,
    erinnerung_2std_aktiv: zweite.aktiv,
    erinnerung_2std_stunden_vorher: zweite.stunden_vorher,
    erinnerung_2std_modus: zweite.modus,
    erinnerung_2std_tage_vorher: zweite.tage_vorher,
    erinnerung_2std_uhrzeit: zweite.uhrzeit,
  };
}

/**
 * Gemeinsame Prüfung für Anlegen und Speichern eines Kundentermins.
 * `neuerKunde` = true: Der Kunde wird gleich mit angelegt (nur beim Anlegen);
 * `customer_id` bleibt dann leer und wird nach dem Einfügen gesetzt.
 */
async function terminPruefen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData,
  neuerKunde = false,
) {
  const kundeId = text(formData, "kunde");
  const terminart = text(formData, "terminart");
  const ort = text(formData, "ort");

  if (!neuerKunde && !istUuid(kundeId)) return { fehler: "Bitte einen Kunden auswählen." };
  if (!istTerminart(terminart)) return { fehler: "Bitte eine Terminart auswählen." };
  if (!istOrt(ort)) return { fehler: "Bitte einen Ort auswählen." };

  if (!neuerKunde) {
    // Ohne diese Prüfung könnte man per direktem POST einen Termin auf einen
    // fremden Kunden legen — die Termin-Policy prüft nur den Besitzer.
    const { data: kunde } = await supabase
      .from("customers")
      .select("id")
      .eq("id", kundeId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (!kunde) return { fehler: "Dieser Kunde gehört nicht zu deinem Portal." };
  }

  const ortStrasse = ort === "anderer" ? text(formData, "ortStrasse") : "";
  const ortPlzOrt = ort === "anderer" ? text(formData, "ortPlzOrt") : "";
  if (ort === "anderer" && !ortStrasse && !ortPlzOrt) {
    return { fehler: "Bitte die Adresse des Orts eintragen." };
  }

  const zeit = zeitraum(zeitpunktAus(formData), text(formData, "dauer"));
  if ("fehler" in zeit) return { fehler: zeit.fehler };

  const partner = await partnerPruefen(userId, text(formData, "partner"));
  if ("fehler" in partner) return { fehler: partner.fehler };

  const erinnerungen = erinnerungenPruefen(formData);
  if ("fehler" in erinnerungen) return { fehler: erinnerungen.fehler };

  return {
    datensatz: {
      kind: "kundentermin" as const,
      customer_id: neuerKunde ? null : kundeId,
      appointment_type: terminart,
      location: ort,
      ort_strasse: ortStrasse || null,
      ort_plz_ort: ortPlzOrt || null,
      nutzen: nutzenAus(formData),
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
  "id, kind, customer_id, partner_id, parent_appointment_id, appointment_type, location, ort_strasse, ort_plz_ort, starts_at, ends_at, notes, status, google_event_id, meet_link";

type KalenderZeile = {
  id: string;
  kind: "kundentermin" | "vorbereitung";
  customer_id: string | null;
  partner_id: string | null;
  parent_appointment_id: string | null;
  appointment_type: string | null;
  location: Ort;
  ort_strasse: string | null;
  ort_plz_ort: string | null;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  status: string;
  google_event_id: string | null;
  meet_link: string | null;
};

/** Der Ort, wie er im Kalendereintrag steht — bei digitalen Terminen steht dort der Meet-Link. */
function kalenderOrt(zeile: KalenderZeile): string | null {
  switch (zeile.location) {
    case "buero":
      return ORTE.buero;
    case "telefon":
      return ORTE.telefon;
    case "anderer":
      return adresseZusammen(zeile.ort_strasse, zeile.ort_plz_ort) ?? ORTE.anderer;
    case "digital":
      return null;
  }
}

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

  return kunde ? kundenName(kunde.first_name, kunde.last_name) : null;
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
    ort: kalenderOrt(zeile),
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

/**
 * Kombiniert die Rückmeldung einer Aktion mit der des Kalenders. `zusatz`
 * (z. B. "Mail-Entwurf neu erstellt") hängt in beiden Fällen hinten an.
 */
function mitKalenderHinweis(
  erfolg: string,
  abgleich: Abgleich,
  zusatz: string | null = null,
): FormularStatus {
  const anhang = zusatz ? ` ${zusatz}` : "";
  // Der Hinweis meldet einen Kalenderfehler und sagt selbst dazu, dass der
  // Termin gespeichert ist — deshalb steht er im Feld `fehler`.
  return abgleich.hinweis
    ? { fehler: abgleich.hinweis + anhang }
    : { hinweis: erfolg + anhang };
}

/* --------------------------------------------------------------------------
 * E-Mail an den Kunden (Phase 6)
 *
 * Direkt nach dem Anlegen entsteht ein Entwurf — rein aus der Vorlage, die
 * Platzhalter durch die echten Termindaten ersetzt, ohne KI. Verschickt wird
 * er entweder sofort (Häkchen im Termin-Wizard) oder nach Prüfung per Klick
 * auf der Terminseite. Dort lässt sich auch ein persönlicher Hinweis per KI
 * einarbeiten.
 *
 * Ändern sich die Termindaten, die in der Mail stehen (Datum, Ort, Terminart,
 * Kunde, Meet-Link), entsteht der Entwurf neu — sonst ginge das alte Datum
 * raus. `bestaetigung_entwurf_am` hält fest, wann der Entwurf zuletzt geändert
 * wurde; später als der letzte Versand heißt: Kunde kennt diese Fassung nicht.
 *
 * Die automatischen Erinnerungen ("1 Tag vorher" / "2 Std vorher") sind
 * bewusst nicht Teil davon — die baut der pg_cron-Erinnerungs-Job in Phase 7,
 * auf denselben Bausteinen (`vorlageLaden`, `platzhalterErsetzen`, `email_log`).
 * ----------------------------------------------------------------------- */

type MailZeile = {
  kind: "kundentermin" | "vorbereitung";
  customer_id: string | null;
  appointment_type: string | null;
  location: Ort;
  ort_strasse: string | null;
  ort_plz_ort: string | null;
  nutzen: string[] | null;
  starts_at: string;
  meet_link: string | null;
};

/** Alles, was eine Mail über den Termin wissen muss — die Vorlage wählt sich danach aus. */
const MAIL_FELDER =
  "kind, customer_id, appointment_type, location, ort_strasse, ort_plz_ort, nutzen, starts_at, meet_link";

type Kunde = MailKunde & { email: string | null };

async function kundeLaden(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kundeId: string,
): Promise<Kunde | null> {
  const { data } = await supabase
    .from("customers")
    .select("first_name, last_name, email, anrede, anrede_titel")
    .eq("id", kundeId)
    .maybeSingle();

  return data
    ? {
        vorname: data.first_name ?? "",
        nachname: data.last_name ?? "",
        email: data.email,
        anrede: data.anrede as Anrede,
        anredeTitel: data.anrede_titel as AnredeTitel | null,
      }
    : null;
}

type Profil = {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string;
  signature: string | null;
};

async function profilLaden(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Profil | null> {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, company, email, signature")
    .eq("id", userId)
    .maybeSingle();

  return (data as Profil | null) ?? null;
}

/** Zeitpunkt des letzten erfolgreichen Versands der Bestätigung, sonst null. */
async function letzterVersand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  terminId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("email_log")
    .select("sent_at")
    .eq("appointment_id", terminId)
    .eq("purpose", "bestaetigung")
    .is("error", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.sent_at ?? null;
}

/** Die Termindaten, die in der Bestätigung stehen — als Vergleichswert vor/nach einer Änderung. */
async function mailStand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  terminId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("appointments")
    .select("customer_id, appointment_type, location, ort_strasse, ort_plz_ort, starts_at, meet_link")
    .eq("id", terminId)
    .eq("owner_id", userId)
    .maybeSingle();

  return data ? JSON.stringify(data) : null;
}

/**
 * Erstellt (oder ersetzt) den Mail-Entwurf zur Terminbestätigung aus der
 * Vorlage. Wirft nie — der Termin steht so oder so schon. Liefert, ob ein
 * Entwurf entstanden ist.
 */
async function bestaetigungEntwurfErstellen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  terminId: string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("appointments")
      .select(MAIL_FELDER)
      .eq("id", terminId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (!data) return false;
    const zeile = data as MailZeile;

    if (
      zeile.kind !== "kundentermin" ||
      !zeile.customer_id ||
      !zeile.appointment_type ||
      !istTerminart(zeile.appointment_type) ||
      !TERMINARTEN[zeile.appointment_type].bestaetigungAnKunden
    ) {
      return false;
    }

    const [kunde, profil] = await Promise.all([
      kundeLaden(supabase, zeile.customer_id),
      profilLaden(supabase, userId),
    ]);
    if (!kunde || !kunde.email) return false;

    const vorlage = await vorlageLaden(
      supabase,
      userId,
      zeile.appointment_type,
      "bestaetigung",
      kunde.anrede,
      zeile.location === "telefon",
    );
    if (!vorlage) return false;

    const html = mitMeetLink(
      platzhalterErsetzen(
        vorlage.html,
        platzhalterWerte(zeile, kunde, profil ? beraterName(profil) : ""),
      ),
      zeile,
    );

    const { error } = await supabase
      .from("appointments")
      .update({
        bestaetigung_entwurf_html: mailHtmlSaeubern(html),
        bestaetigung_entwurf_am: new Date().toISOString(),
      })
      .eq("id", terminId)
      .eq("owner_id", userId);

    return !error;
  } catch {
    // Absicht: ein Entwurf, der nicht entsteht, darf den Termin nicht kippen.
    return false;
  }
}

/**
 * Nach einer Änderung am Termin: Stehen in der Mail jetzt andere Daten als
 * vorher, entsteht der Entwurf neu aus der Vorlage. Liefert den Satz, der
 * dem Vermittler dazu angezeigt wird, oder null.
 */
async function entwurfNachAenderung(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  terminId: string,
  vorher: string | null,
): Promise<string | null> {
  if (vorher === null || vorher === (await mailStand(supabase, userId, terminId))) {
    return null;
  }
  // Der Kunde hat dem alten Termin zugesagt, nicht dem geänderten.
  const { data: zurueckgesetzt } = await supabase
    .from("appointments")
    .update({ kunde_zugesagt_am: null })
    .eq("id", terminId)
    .eq("owner_id", userId)
    .not("kunde_zugesagt_am", "is", null)
    .select("id");
  const zusageSatz =
    zurueckgesetzt && zurueckgesetzt.length > 0
      ? " Die Zusage des Kunden galt dem alten Termin und wurde zurückgesetzt."
      : "";

  if (!(await bestaetigungEntwurfErstellen(supabase, userId, terminId))) {
    return zusageSatz.trim() || null;
  }

  return (
    ((await letzterVersand(supabase, terminId))
      ? "Der Mail-Entwurf wurde mit den neuen Termindaten neu erstellt. Die Bestätigung war schon verschickt — bitte unten erneut senden."
      : "Der Mail-Entwurf wurde mit den neuen Termindaten neu erstellt.") + zusageSatz
  );
}

/**
 * Verschickt den gespeicherten Entwurf samt Signatur. Prüft den
 * Duplikatschutz aus `email_log` — erneutes Senden nur mit `erneut`.
 */
async function bestaetigungVerschicken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: string,
  erneut: boolean,
): Promise<FormularStatus> {
  const { data: termin } = await supabase
    .from("appointments")
    .select(
      "customer_id, appointment_type, location, ort_strasse, ort_plz_ort, nutzen, starts_at, ends_at, meet_link, bestaetigung_entwurf_html, zusage_token, kunde_zugesagt_am",
    )
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!termin || !termin.customer_id || !termin.appointment_type || !istTerminart(termin.appointment_type)) {
    return { fehler: "Dieser Termin gehört nicht zu deinem Portal." };
  }
  if (!termin.bestaetigung_entwurf_html) {
    return { fehler: "Es gibt noch keinen Mail-Entwurf zu diesem Termin." };
  }

  if ((await letzterVersand(supabase, id)) && !erneut) {
    return {
      fehler:
        "Diese Bestätigung wurde schon verschickt. Zum erneuten Senden bitte bestätigen.",
    };
  }

  const kunde = await kundeLaden(supabase, termin.customer_id);
  if (!kunde || !kunde.email) {
    return { fehler: "Für diesen Kunden ist keine E-Mail-Adresse hinterlegt." };
  }

  const profil = await profilLaden(supabase, userId);
  if (!profil) return { fehler: "Dein Profil konnte nicht geladen werden." };

  const vorlage = await vorlageLaden(
    supabase,
    userId,
    termin.appointment_type,
    "bestaetigung",
    kunde.anrede,
    termin.location === "telefon",
  );

  const ergebnis = await mailVersenden({
    an: kunde.email,
    betreff: bestaetigungBetreff(
      vorlage,
      termin.appointment_type,
      platzhalterWerte(
        {
          location: termin.location as Ort,
          starts_at: termin.starts_at,
          ort_strasse: termin.ort_strasse,
          ort_plz_ort: termin.ort_plz_ort,
        },
        kunde,
        beraterName(profil),
      ),
      termin.nutzen ?? [],
    ),
    html: mailMitSignatur(
      termin.bestaetigung_entwurf_html,
      profil.signature,
      // Knöpfe für den Kunden: Termin zusagen, in den Kalender übernehmen.
      kundenAktionenHtml(
        {
          terminart: termin.appointment_type,
          ort: termin.location as Ort,
          adresse: adresseZusammen(termin.ort_strasse, termin.ort_plz_ort),
          beginn: termin.starts_at,
          ende: termin.ends_at,
          meetLink: termin.meet_link,
          vermittler: [profil.first_name, profil.last_name].filter(Boolean).join(" "),
          firma: profil.company,
        },
        termin.zusage_token,
        oeffentlicheBasis(await anfrageHerkunft()),
        Boolean(termin.kunde_zugesagt_am),
      ),
    ),
    absenderName: absenderName(profil),
    replyTo: profil.email,
  });

  if (ergebnis.status === "nicht_eingerichtet") {
    return {
      fehler:
        "Der Mailversand ist noch nicht eingerichtet (RESEND_API_KEY fehlt in .env.local).",
    };
  }
  if (ergebnis.status === "fehler") {
    await supabase
      .from("email_log")
      .insert({ appointment_id: id, recipient: kunde.email, purpose: "bestaetigung", error: ergebnis.meldung });
    return { fehler: `Versand fehlgeschlagen: ${ergebnis.meldung}` };
  }

  await supabase
    .from("email_log")
    .insert({ appointment_id: id, recipient: kunde.email, purpose: "bestaetigung" });

  return { hinweis: `Bestätigung an ${kunde.email} verschickt.` };
}

export async function bestaetigungSenden(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) return { fehler: "Der Termin konnte nicht zugeordnet werden." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const ergebnis = await bestaetigungVerschicken(
    supabase,
    user.id,
    id,
    text(formData, "erneut") === "on",
  );

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return ergebnis;
}

/** Speichert einen neuen Entwurfstext (von Hand bearbeitet oder von der KI). */
async function entwurfSpeichern(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: string,
  html: string,
): Promise<string | null> {
  const { error } = await supabase
    .from("appointments")
    .update({
      bestaetigung_entwurf_html: mailHtmlSaeubern(html),
      bestaetigung_entwurf_am: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", userId);

  return error ? error.message : null;
}

/** Manuelle Bearbeitung des Entwurfs speichern. */
export async function bestaetigungEntwurfAktualisieren(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) return { fehler: "Der Termin konnte nicht zugeordnet werden." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const fehler = await entwurfSpeichern(supabase, user.id, id, text(formData, "entwurf"));
  if (fehler) return { fehler: `Speichern fehlgeschlagen: ${fehler}` };

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return { hinweis: "Entwurf gespeichert." };
}

/** Verwirft den bisherigen Entwurf und erstellt ihn frisch aus der Vorlage. */
export async function bestaetigungAusVorlage(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) return { fehler: "Der Termin konnte nicht zugeordnet werden." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  if (!(await bestaetigungEntwurfErstellen(supabase, user.id, id))) {
    return {
      fehler:
        "Der Entwurf ließ sich nicht erstellen. Hat der Kunde eine E-Mail-Adresse?",
    };
  }

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return { hinweis: "Entwurf neu aus der Vorlage erstellt." };
}

const HINWEIS_MAX_ZEICHEN = 1000;

/** Arbeitet einen persönlichen Hinweis per KI in den aktuellen Entwurf ein. */
export async function bestaetigungHinweisEinarbeiten(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) return { fehler: "Der Termin konnte nicht zugeordnet werden." };

  const hinweis = text(formData, "hinweis");
  if (!hinweis) return { fehler: "Bitte schreib zuerst, was in die Mail soll." };
  if (hinweis.length > HINWEIS_MAX_ZEICHEN) {
    return { fehler: `Der Hinweis darf höchstens ${HINWEIS_MAX_ZEICHEN} Zeichen lang sein.` };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { data: termin } = await supabase
    .from("appointments")
    .select(`${MAIL_FELDER}, bestaetigung_entwurf_html`)
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!termin || !termin.customer_id) {
    return { fehler: "Dieser Termin gehört nicht zu deinem Portal." };
  }
  if (!termin.bestaetigung_entwurf_html) {
    return { fehler: "Es gibt noch keinen Mail-Entwurf zu diesem Termin." };
  }

  const [kunde, profil] = await Promise.all([
    kundeLaden(supabase, termin.customer_id),
    profilLaden(supabase, user.id),
  ]);
  if (!kunde) return { fehler: "Der Kunde zu diesem Termin wurde nicht gefunden." };

  const werte = platzhalterWerte(termin as MailZeile, kunde, profil ? beraterName(profil) : "");
  const ergebnis = await hinweisEinarbeiten(termin.bestaetigung_entwurf_html, hinweis, {
    ...werte,
    terminart: terminartLabel(termin.appointment_type ?? ""),
  });
  if ("fehler" in ergebnis) return { fehler: ergebnis.fehler };

  const fehler = await entwurfSpeichern(supabase, user.id, id, ergebnis.html);
  if (fehler) return { fehler: `Speichern fehlgeschlagen: ${fehler}` };

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return { hinweis: "Hinweis eingearbeitet — bitte vor dem Senden kurz gegenlesen." };
}

export async function terminAnlegen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const werte = werteVon(formData);

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  // Ein neuer Kunde wird im selben Zug angelegt — erst nach der Prüfung aller
  // Felder, damit kein Kunde ohne Termin übrig bleibt, wenn etwas fehlt.
  const neuerKunde = text(formData, "kundeModus") === "neu";
  const kundenWerte = neuerKunde ? kundenWerteLesen(formData, "neu") : null;
  if (kundenWerte) {
    const fehler = kundenPruefen(kundenWerte);
    if (fehler) return { fehler, werte };
  }

  const geprueft = await terminPruefen(supabase, user.id, formData, neuerKunde);
  if ("fehler" in geprueft) return { fehler: geprueft.fehler, werte };

  let kundeId = geprueft.datensatz.customer_id;
  if (kundenWerte) {
    // Der Partner des Termins gilt auch als Herkunft des neuen Kunden.
    const { data: kunde, error } = await supabase
      .from("customers")
      .insert({
        ...kundenDatensatz(kundenWerte, geprueft.datensatz.partner_id),
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (error) return { fehler: `Kunde anlegen fehlgeschlagen: ${error.message}`, werte };
    kundeId = kunde.id;
    revalidatePath("/kunden");
  }

  const { data: termin, error } = await supabase
    .from("appointments")
    .insert({ ...geprueft.datensatz, customer_id: kundeId, owner_id: user.id })
    .select("id")
    .single();

  if (error) return { fehler: `Anlegen fehlgeschlagen: ${error.message}`, werte };

  // Ab hier steht der Termin. Ob er auch im Kalender landet, zeigt die
  // Terminseite an — dorthin geht es am Ende dieser Aktion ohnehin.
  await kalenderAbgleich(supabase, user.id, termin.id);

  // Der Mail-Entwurf entsteht direkt mit (aus der Vorlage, ohne KI). Mit
  // Häkchen im Wizard geht er sofort raus, sonst per Klick auf der Terminseite.
  await bestaetigungEntwurfErstellen(supabase, user.id, termin.id);

  let mailRueckmeldung: "gesendet" | "fehler" | null = null;
  if (formData.get("sofortSenden") === "on") {
    const versand = await bestaetigungVerschicken(supabase, user.id, termin.id, false);
    mailRueckmeldung = versand.fehler ? "fehler" : "gesendet";
  }
  const mailSatz =
    mailRueckmeldung === "gesendet"
      ? " Die Bestätigung an den Kunden ist verschickt."
      : mailRueckmeldung === "fehler"
        ? " Die Bestätigung konnte nicht verschickt werden — bitte auf der Terminseite prüfen."
        : "";

  // Bei einer Beratung kann direkt der Vorbereitungstermin mit angelegt werden.
  // Halb ausgefüllt zählt nicht — sonst entsteht stillschweigend keiner.
  const vorbereitungDatum = text(formData, "vorbereitungDatum");
  const vorbereitungUhrzeit = text(formData, "vorbereitungUhrzeit");

  if (Boolean(vorbereitungDatum) !== Boolean(vorbereitungUhrzeit)) {
    seitenAktualisieren();
    return {
      fehler:
        `Der Termin wurde angelegt. Für den Vorbereitungstermin fehlt noch Datum oder Uhrzeit — du kannst ihn auf der Terminseite nachtragen.${mailSatz}`,
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
        fehler: `Der Termin wurde angelegt, aber der Vorbereitungstermin nicht: ${vorbereitung.fehler}${mailSatz}`,
        werte,
      };
    }

    await kalenderAbgleich(supabase, user.id, vorbereitung.id);
  }

  seitenAktualisieren();
  redirect(
    mailRueckmeldung
      ? `/termine/${termin.id}?mail=${mailRueckmeldung}`
      : `/termine/${termin.id}`,
  );
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

  const vorher = await mailStand(supabase, user.id, id);

  const { error } = await supabase
    .from("appointments")
    .update(geprueft.datensatz)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}`, werte };

  // Erst der Kalender (er liefert ggf. einen neuen Meet-Link), dann die Mail.
  const abgleich = await kalenderAbgleich(supabase, user.id, id);
  const mailHinweis = await entwurfNachAenderung(supabase, user.id, id, vorher);

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return mitKalenderHinweis("Änderungen gespeichert.", abgleich, mailHinweis);
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

  // Kommt beim Nachtragen ein Meet-Link dazu, gehört er auch in die Mail.
  const vorher = await mailStand(supabase, user.id, id);
  const abgleich = await kalenderAbgleich(supabase, user.id, id);
  const mailHinweis = await entwurfNachAenderung(supabase, user.id, id, vorher);

  if (abgleich.hinweis) return { fehler: abgleich.hinweis };
  if (!abgleich.eingetragen) {
    return {
      fehler:
        "Es ist kein Google-Kalender verbunden. Du kannst ihn in den Einstellungen verbinden.",
    };
  }

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return {
    hinweis: `Der Termin steht jetzt in deinem Google-Kalender.${mailHinweis ? ` ${mailHinweis}` : ""}`,
  };
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

/* --------------------------------------------------------------------------
 * Eigene Nutzen — die feste Liste steht in terminarten.ts, eigene Einträge
 * im Profil. Direkt aus dem Terminformular aufgerufen (kein eigenes Formular,
 * das das Terminformular zurücksetzen würde). Liefert immer die aktuelle Liste.
 * ----------------------------------------------------------------------- */

export async function nutzenHinzufuegen(
  name: string,
): Promise<{ liste: string[] } | { fehler: string }> {
  const wert = name.trim().slice(0, NUTZEN_ZEICHEN_MAX);
  if (!wert) return { fehler: "Bitte ein Thema eintragen." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { data: profil } = await supabase
    .from("profiles")
    .select("nutzen_eigene")
    .eq("id", user.id)
    .maybeSingle();

  const bisher = (profil?.nutzen_eigene as string[] | null) ?? [];
  const liste = bisher.includes(wert) ? bisher : [...bisher, wert];

  const { error } = await supabase
    .from("profiles")
    .update({ nutzen_eigene: liste })
    .eq("id", user.id);

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}` };
  return { liste };
}

export async function nutzenEntfernen(
  name: string,
): Promise<{ liste: string[] } | { fehler: string }> {
  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { data: profil } = await supabase
    .from("profiles")
    .select("nutzen_eigene")
    .eq("id", user.id)
    .maybeSingle();

  const liste = ((profil?.nutzen_eigene as string[] | null) ?? []).filter(
    (eintrag) => eintrag !== name,
  );

  const { error } = await supabase
    .from("profiles")
    .update({ nutzen_eigene: liste })
    .eq("id", user.id);

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}` };
  return { liste };
}
