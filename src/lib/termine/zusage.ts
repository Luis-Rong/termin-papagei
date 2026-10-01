import { createClient } from "@/lib/supabase/server";
import type { KundenTermin } from "@/lib/termine/kundenlinks";
import type { Ort, TerminStatus } from "@/lib/termine/terminarten";

/**
 * Der Termin, wie ihn der Kunde über seinen Zusage-Link sehen darf. Läuft
 * ohne Login über die Datenbank-Funktion `termin_zusage_laden`
 * (0014_kunden_zusage.sql) — die gibt nur diesen einen Termin heraus, und nur
 * Art, Zeit, Ort und den Namen des Vermittlers.
 */
export type ZusageTermin = KundenTermin & {
  status: TerminStatus;
  zugesagtAm: string | null;
};

/** Der Schlüssel im Link: 64 Hex-Zeichen. Alles andere gar nicht erst nachschlagen. */
export function istZusageToken(wert: string): boolean {
  return /^[0-9a-f]{64}$/.test(wert);
}

export async function zusageTerminLaden(token: string): Promise<ZusageTermin | null> {
  if (!istZusageToken(token)) return null;

  const supabase = await createClient();
  const { data } = await supabase.rpc("termin_zusage_laden", { p_token: token });
  const zeile = Array.isArray(data) ? data[0] : null;
  if (!zeile) return null;

  return {
    terminart: zeile.terminart,
    ort: zeile.ort as Ort,
    beginn: zeile.beginn,
    ende: zeile.ende,
    meetLink: zeile.meet_link,
    vermittler: zeile.vermittler,
    firma: zeile.firma,
    status: zeile.status as TerminStatus,
    zugesagtAm: zeile.zugesagt_am,
  };
}
