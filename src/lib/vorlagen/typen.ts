/**
 * Der Zweck einer E-Mail-Vorlage — deckt sich mit den beiden konfigurierbaren
 * Erinnerungen aus `src/lib/termine/terminarten.ts` (erinnerung_1tag /
 * erinnerung_2std) und der Sofort-Bestätigung. Mailversand (Phase 6) und
 * dieser Typ lesen dieselbe Quelle, damit nichts auseinanderläuft.
 */
export const ZWECKE = {
  bestaetigung: "Bestätigung",
  erinnerung_1tag: "Erinnerung — 1 Tag vorher",
  erinnerung_2std: "Erinnerung — 2 Std vorher",
} as const;

export type Zweck = keyof typeof ZWECKE;

export const ZWECK_REIHENFOLGE = [
  "bestaetigung",
  "erinnerung_1tag",
  "erinnerung_2std",
] as const satisfies readonly Zweck[];

export function istZweck(wert: string): wert is Zweck {
  return wert in ZWECKE;
}
