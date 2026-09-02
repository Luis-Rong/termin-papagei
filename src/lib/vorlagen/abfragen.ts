import { createClient } from "@/lib/supabase/server";
import type { Terminart } from "@/lib/termine/terminarten";
import type { Zweck } from "@/lib/vorlagen/typen";

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
  const supabase = await createClient();

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
