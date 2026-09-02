/**
 * Die Regeln aus der Projektspezifikation — die einzige Quelle dafür, was eine
 * Terminart auslöst.
 *
 * Hier lesen später auch der Mail-Versand (Phase 6) und der nächtliche
 * Erinnerungs-Job (Phase 7) mit. Deshalb stehen die Regeln als Daten hier und
 * nicht verstreut in den Formularen: Sonst laufen Oberfläche und Automatik
 * garantiert irgendwann auseinander.
 *
 * Diese Datei darf nichts vom Server importieren — sie wird auch im
 * Termin-Formular (Client-Komponente) verwendet.
 */

export type TerminartRegeln = {
  label: string;
  /** Vorgabe für die Dauer; im Formular änderbar. */
  dauerMinuten: number;
  /** Bestätigung sofort nach dem Anlegen an den Kunden. */
  bestaetigungAnKunden: boolean;
  /** 1 Tag vorher: Erinnerung an den Vermittler, den Kunden anzurufen. */
  anrufErinnerungAnVermittler: boolean;
  /** Zusätzlich wird ein eigener Vorbereitungstermin vereinbart. */
  vorbereitungstermin: boolean;
};

// Die beiden Kunden-Erinnerungen (1 Tag / 2 Std vorher) sind seit Sep 2026
// nicht mehr terminart-abhängig, sondern für jede Terminart gleich: Standard
// an, je Termin einzeln abschaltbar und im Vorlauf änderbar — siehe
// `erinnerung_1tag_aktiv` usw. in `appointments`, nicht hier.
export const TERMINARTEN = {
  erstgespraech: {
    label: "Erstgespräch",
    dauerMinuten: 60,
    bestaetigungAnKunden: true,
    anrufErinnerungAnVermittler: false,
    vorbereitungstermin: false,
  },
  beratung: {
    label: "Beratung",
    dauerMinuten: 90,
    bestaetigungAnKunden: true,
    anrufErinnerungAnVermittler: false,
    vorbereitungstermin: true,
  },
  umsetzung: {
    label: "Umsetzung",
    dauerMinuten: 60,
    bestaetigungAnKunden: true,
    anrufErinnerungAnVermittler: true,
    vorbereitungstermin: false,
  },
  after_sales: {
    label: "After-Sales",
    dauerMinuten: 45,
    bestaetigungAnKunden: true,
    anrufErinnerungAnVermittler: false,
    vorbereitungstermin: false,
  },
  service: {
    label: "Service",
    dauerMinuten: 30,
    bestaetigungAnKunden: true,
    anrufErinnerungAnVermittler: false,
    vorbereitungstermin: false,
  },
} as const satisfies Record<string, TerminartRegeln>;

export type Terminart = keyof typeof TERMINARTEN;

/** Reihenfolge für Auswahllisten — wie im Beratungsablauf. */
export const TERMINART_REIHENFOLGE = [
  "erstgespraech",
  "beratung",
  "umsetzung",
  "after_sales",
  "service",
] as const satisfies readonly Terminart[];

export function istTerminart(wert: string): wert is Terminart {
  return wert in TERMINARTEN;
}

export function terminartLabel(wert: string): string {
  return istTerminart(wert) ? TERMINARTEN[wert].label : wert;
}

export const ORTE = {
  buero: "Im Büro",
  digital: "Digital",
} as const;

export type Ort = keyof typeof ORTE;

export function istOrt(wert: string): wert is Ort {
  return wert in ORTE;
}

export const STATUS = {
  geplant: "Geplant",
  wahrgenommen: "Wahrgenommen",
  abgesagt: "Abgesagt",
} as const;

export type TerminStatus = keyof typeof STATUS;

export function istStatus(wert: string): wert is TerminStatus {
  return wert in STATUS;
}

/**
 * Defaults für die beiden Kunden-Erinnerungen — müssen zur Migration
 * 0006_erinnerungen.sql (Spalten-Defaults) passen. Der Vorlauf ist je Termin
 * im Wizard änderbar; das Limit deckt sich mit der DB-Check-Constraint.
 */
export const ERINNERUNG_1TAG_STUNDEN_VORGABE = 24;
export const ERINNERUNG_2STD_STUNDEN_VORGABE = 2;
export const ERINNERUNG_STUNDEN_MAX = 168;

/** Auswahl im Formular; die Vorgabe je Terminart kommt aus TERMINARTEN. */
export const DAUER_VORSCHLAEGE = [30, 45, 60, 90, 120, 180] as const;

export function dauerLabel(minuten: number): string {
  if (minuten < 60) return `${minuten} Minuten`;
  const stunden = minuten / 60;
  if (Number.isInteger(stunden)) {
    return stunden === 1 ? "1 Stunde" : `${stunden} Stunden`;
  }
  return `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, "0")} Stunden`;
}
