import type { createClient } from "@/lib/supabase/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Terminart } from "@/lib/termine/terminarten";
import type { Zweck } from "@/lib/vorlagen/typen";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Vorlage = {
  id: string;
  terminart: Terminart;
  zweck: Zweck;
  betreff: string;
  text: string;
  /** true = eigene Vorlage, false = gemeinsame Systemvorlage. */
  eigene: boolean;
};

type VorlagenZeile = {
  id: string;
  owner_id: string | null;
  appointment_type: Terminart;
  purpose: Zweck;
  subject: string;
  body: string;
};

/**
 * Alle für den Vermittler sichtbaren Vorlagen: die gemeinsamen Systemvorlagen
 * und seine eigenen — fremde Vorlagen anderer Vermittler sieht er nicht
 * (durchgesetzt über RLS, hier zusätzlich zur Sortierung).
 */
export async function vorlagenLaden(
  userId: string,
): Promise<{ vorlagen: Vorlage[]; fehler?: string }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("templates")
    .select("id, owner_id, appointment_type, purpose, subject, body")
    .order("appointment_type")
    .order("purpose");

  if (error) return { vorlagen: [], fehler: error.message };

  const vorlagen = ((data ?? []) as VorlagenZeile[]).map((zeile) => ({
    id: zeile.id,
    terminart: zeile.appointment_type,
    zweck: zeile.purpose,
    betreff: zeile.subject,
    text: zeile.body,
    eigene: zeile.owner_id === userId,
  }));

  return { vorlagen };
}

export type GeladeneVorlage = { betreff: string; html: string };

/**
 * Lädt die Vorlage für Terminart und Zweck: die eigene, falls vorhanden,
 * sonst die gemeinsame Systemvorlage als Fallback. Einzige Stelle, die diese
 * Auswahl trifft — Phase 7 (Erinnerungs-Job) liest hier mit, statt es
 * nachzubauen.
 */
export async function vorlageLaden(
  supabase: Supabase,
  userId: string,
  terminart: Terminart,
  zweck: Zweck,
): Promise<GeladeneVorlage | null> {
  const { data } = await supabase
    .from("templates")
    .select("subject, body, owner_id")
    .eq("appointment_type", terminart)
    .eq("purpose", zweck)
    .or(`owner_id.eq.${userId},owner_id.is.null`);

  if (!data || data.length === 0) return null;

  // Eigene Vorlage hat Vorrang vor der Systemvorlage.
  const vorlage = data.find((zeile) => zeile.owner_id === userId) ?? data[0];
  return { betreff: vorlage.subject, html: vorlage.body };
}

const PLATZHALTER_MUSTER: Record<string, string> = {
  "{{vorname}}": "vorname",
  "{{datum}}": "datum",
  "{{uhrzeit}}": "uhrzeit",
  "{{ort}}": "ort",
};

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
  datum: string;
  uhrzeit: string;
  ort: string;
};

/**
 * Ersetzt `{{vorname}}` usw. durch die echten, HTML-sicher escapten
 * Termindaten. Läuft vor dem LLM: Die eingesetzten Werte gelten danach als
 * unveränderlich (siehe `src/lib/llm`).
 */
export function platzhalterErsetzen(html: string, werte: PlatzhalterWerte): string {
  let ergebnis = html;
  for (const [platzhalter, feld] of Object.entries(PLATZHALTER_MUSTER)) {
    ergebnis = ergebnis.replaceAll(
      platzhalter,
      htmlEscapen(werte[feld as keyof typeof werte]),
    );
  }
  return ergebnis;
}

/**
 * Dieselbe Ersetzung für den Betreff — reiner Text statt HTML, deshalb ohne
 * Escaping (ein Betreff kennt kein `&amp;`).
 */
export function betreffErsetzen(betreff: string, werte: PlatzhalterWerte): string {
  let ergebnis = betreff;
  for (const [platzhalter, feld] of Object.entries(PLATZHALTER_MUSTER)) {
    ergebnis = ergebnis.replaceAll(platzhalter, werte[feld as keyof typeof werte]);
  }
  return ergebnis;
}
