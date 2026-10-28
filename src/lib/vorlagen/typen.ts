import { TERMINARTEN, type Terminart } from "@/lib/termine/terminarten";

/**
 * Der Zweck einer E-Mail-Vorlage — deckt sich mit den beiden Erinnerungen
 * (erinnerung_1tag / erinnerung_2std) und der Sofort-Bestätigung. `sonstige`
 * sind freie eigene Vorlagen ohne festen Einsatz.
 *
 * Diese Datei darf nichts vom Server importieren.
 */
export const ZWECKE = {
  bestaetigung: "Bestätigung",
  erinnerung_1tag: "1. Erinnerung",
  erinnerung_2std: "2. Erinnerung",
  sonstige: "Sonstige",
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

/** Du oder Sie — jeder Kunde hat eine Anrede, jede Vorlage gilt für eine. */
export const ANREDEN = {
  du: "Per Du",
  sie: "Per Sie",
} as const;

export type Anrede = keyof typeof ANREDEN;

export function istAnrede(wert: string): wert is Anrede {
  return wert in ANREDEN;
}

export const ANREDE_TITEL = {
  herr: "Herr",
  frau: "Frau",
} as const;

export type AnredeTitel = keyof typeof ANREDE_TITEL;

export function istAnredeTitel(wert: string): wert is AnredeTitel {
  return wert in ANREDE_TITEL;
}

/**
 * Wofür eine Vorlage gilt: eine Terminart, „telefon" (jede Terminart, die
 * telefonisch stattfindet — hat Vorrang vor der Terminart) oder „sonstige".
 * In der Datenbank steht das in `templates.appointment_type`.
 */
export const VORLAGEN_BEREICHE = {
  erstgespraech: TERMINARTEN.erstgespraech.label,
  beratung: TERMINARTEN.beratung.label,
  umsetzung: TERMINARTEN.umsetzung.label,
  after_sales: TERMINARTEN.after_sales.label,
  service: TERMINARTEN.service.label,
  telefon: "Telefontermin",
  sonstige: "Sonstige Vorlagen",
} as const satisfies Record<Terminart | "telefon" | "sonstige", string>;

export type VorlagenBereich = keyof typeof VORLAGEN_BEREICHE;

export const VORLAGEN_BEREICH_REIHENFOLGE = [
  "erstgespraech",
  "beratung",
  "umsetzung",
  "after_sales",
  "service",
  "telefon",
  "sonstige",
] as const satisfies readonly VorlagenBereich[];

export function istVorlagenBereich(wert: string): wert is VorlagenBereich {
  return wert in VORLAGEN_BEREICHE;
}

/** Die Platzhalter, die beim Versand durch Termindaten ersetzt werden — fürs Einfügen-Menü. */
export const PLATZHALTER = [
  { label: "Vorname", wert: "{{vorname}}" },
  { label: "Nachname", wert: "{{nachname}}" },
  { label: "Anrede", wert: "{{anrede}}" },
  { label: "Berater", wert: "{{berater}}" },
  { label: "Tag", wert: "{{tag}}" },
  { label: "Datum", wert: "{{datum}}" },
  { label: "Uhrzeit", wert: "{{uhrzeit}}" },
  { label: "Ort", wert: "{{ort}}" },
] as const;

export type Platzhalter = { label: string; wert: string };
