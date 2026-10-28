import type { createClient } from "@/lib/supabase/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Terminart } from "@/lib/termine/terminarten";
import type { Anrede, VorlagenBereich, Zweck } from "@/lib/vorlagen/typen";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Vorlage = {
  id: string;
  bereich: VorlagenBereich;
  zweck: Zweck;
  anrede: Anrede;
  betreff: string;
  text: string;
  /** true = eigene Vorlage, false = gemeinsame Standardvorlage. */
  eigene: boolean;
};

type VorlagenZeile = {
  id: string;
  owner_id: string | null;
  appointment_type: VorlagenBereich;
  purpose: Zweck;
  anrede: Anrede;
  subject: string;
  body: string;
};

/**
 * Alle für den Vermittler sichtbaren Vorlagen: die gemeinsamen Standardvorlagen
 * und seine eigenen — fremde Vorlagen anderer Vermittler sieht er nicht
 * (durchgesetzt über RLS, hier zusätzlich zur Sortierung).
 */
export async function vorlagenLaden(
  userId: string,
): Promise<{ vorlagen: Vorlage[]; fehler?: string }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("templates")
    .select("id, owner_id, appointment_type, purpose, anrede, subject, body")
    .order("appointment_type")
    .order("purpose")
    .order("created_at");

  if (error) return { vorlagen: [], fehler: error.message };

  const vorlagen = ((data ?? []) as VorlagenZeile[]).map((zeile) => ({
    id: zeile.id,
    bereich: zeile.appointment_type,
    zweck: zeile.purpose,
    anrede: zeile.anrede,
    betreff: zeile.subject,
    text: zeile.body,
    eigene: zeile.owner_id === userId,
  }));

  return { vorlagen };
}

export type GeladeneVorlage = { betreff: string; html: string };

/**
 * Lädt die Vorlage für einen Termin: Beim Telefontermin zuerst die Telefon-
 * Vorlage, sonst die der Terminart — jeweils in der Anrede des Kunden, die
 * eigene vor der Standardvorlage. Einzige Stelle, die diese Auswahl trifft;
 * der Erinnerungs-Job liest hier mit, statt es nachzubauen.
 */
export async function vorlageLaden(
  supabase: Supabase,
  userId: string,
  terminart: Terminart,
  zweck: Zweck,
  anrede: Anrede = "du",
  telefon = false,
): Promise<GeladeneVorlage | null> {
  const bereiche: VorlagenBereich[] = telefon ? ["telefon", terminart] : [terminart];

  const { data } = await supabase
    .from("templates")
    .select("subject, body, owner_id, appointment_type")
    .in("appointment_type", bereiche)
    .eq("purpose", zweck)
    .eq("anrede", anrede)
    .or(`owner_id.eq.${userId},owner_id.is.null`);

  if (!data || data.length === 0) return null;

  for (const bereich of bereiche) {
    const passend = data.filter((zeile) => zeile.appointment_type === bereich);
    const vorlage = passend.find((zeile) => zeile.owner_id === userId) ?? passend[0];
    if (vorlage) return { betreff: vorlage.subject, html: vorlage.body };
  }
  return null;
}

/** Ein einzelner Wert, sicher für die Einbettung in HTML escaped. */
export function htmlEscapen(wert: string): string {
  return wert
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type PlatzhalterWerte = {
  vorname: string;
  nachname: string;
  /** Du: der Vorname — Sie: „Herr Mustermann" / „Frau Mustermann". */
  anrede: string;
  berater: string;
  /** „Dienstag" — oder „Dienstag, den 11.11.", wenn es nicht der nächste ist. */
  tag: string;
  datum: string;
  uhrzeit: string;
  ort: string;
};

const PLATZHALTER_FELDER: readonly (keyof PlatzhalterWerte)[] = [
  "vorname",
  "nachname",
  "anrede",
  "berater",
  "tag",
  "datum",
  "uhrzeit",
  "ort",
];

/**
 * Ersetzt `{{vorname}}` usw. durch die echten, HTML-sicher escapten
 * Termindaten. Läuft vor dem LLM: Die eingesetzten Werte gelten danach als
 * unveränderlich (siehe `src/lib/llm`).
 */
export function platzhalterErsetzen(html: string, werte: PlatzhalterWerte): string {
  let ergebnis = html;
  for (const feld of PLATZHALTER_FELDER) {
    ergebnis = ergebnis.replaceAll(`{{${feld}}}`, htmlEscapen(werte[feld]));
  }
  return ergebnis;
}

/**
 * Dieselbe Ersetzung für den Betreff — reiner Text statt HTML, deshalb ohne
 * Escaping (ein Betreff kennt kein `&amp;`).
 */
export function betreffErsetzen(betreff: string, werte: PlatzhalterWerte): string {
  let ergebnis = betreff;
  for (const feld of PLATZHALTER_FELDER) {
    ergebnis = ergebnis.replaceAll(`{{${feld}}}`, werte[feld]);
  }
  return ergebnis;
}
