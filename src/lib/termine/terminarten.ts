/**
 * Die Regeln aus der Projektspezifikation — die einzige Quelle dafür, was eine
 * Terminart auslöst.
 *
 * Hier lesen auch der Mail-Versand und der Erinnerungs-Job mit. Deshalb stehen
 * die Regeln als Daten hier und nicht verstreut in den Formularen: Sonst laufen
 * Oberfläche und Automatik garantiert irgendwann auseinander.
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

// Die beiden Kunden-Erinnerungen sind nicht terminart-abhängig, sondern für
// jede Terminart gleich: Standard an, je Termin einzeln abschaltbar, als
// Vorlauf oder zu fester Uhrzeit — siehe `erinnerung_1tag_*` in `appointments`.
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

/**
 * Die ersten drei Terminarten sind der Hauptberatungsprozess, die beiden
 * anderen die Betreuung danach — in der Auswahl durch einen Strich getrennt.
 */
export const TERMINART_GRUPPEN = [
  ["erstgespraech", "beratung", "umsetzung"],
  ["after_sales", "service"],
] as const satisfies readonly (readonly Terminart[])[];

export function istTerminart(wert: string): wert is Terminart {
  return wert in TERMINARTEN;
}

export function terminartLabel(wert: string): string {
  return istTerminart(wert) ? TERMINARTEN[wert].label : wert;
}

export const ORTE = {
  buero: "Im Büro",
  digital: "Digital",
  telefon: "Telefon",
  anderer: "Anderer Ort",
} as const;

export type Ort = keyof typeof ORTE;

export const ORT_REIHENFOLGE = ["buero", "digital", "telefon", "anderer"] as const satisfies readonly Ort[];

export function istOrt(wert: string): wert is Ort {
  return wert in ORTE;
}

/**
 * Der Ort, wie er im Satz der Kundenmail steht — die Vorlagen setzen
 * `{{ort}}` nach einem Komma ein ("… um 10:00 Uhr, im Büro."). `ORTE` sind
 * dagegen Beschriftungen für Auswahlfelder und Schilder.
 */
export function ortImSatz(ort: Ort, adresse: string | null): string {
  switch (ort) {
    case "buero":
      return "im Büro";
    case "digital":
      return "digital per Videocall";
    case "telefon":
      return "telefonisch";
    case "anderer":
      return adresse ? `vor Ort (${adresse})` : "vor Ort";
  }
}

/** „Berliner Allee 58, 64295 Darmstadt" — oder null, wenn nichts eingetragen ist. */
export function adresseZusammen(strasse: string | null, plzOrt: string | null): string | null {
  const teile = [strasse?.trim(), plzOrt?.trim()].filter(Boolean);
  return teile.length > 0 ? teile.join(", ") : null;
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

/* --------------------------------------------------------------------------
 * Erinnerungen an den Kunden
 *
 * Jede der beiden Erinnerungen läuft in einem von zwei Modi:
 * - `vorlauf`: eine Stundenzahl vor dem Termin (Spalte *_stunden_vorher).
 * - `uhrzeit`: an einem bestimmten Tag um eine feste Uhrzeit — „am Termintag
 *   um 9:00" oder „1 Tag vorher um 18:00" (Spalten *_tage_vorher, *_uhrzeit).
 * ----------------------------------------------------------------------- */

export type ErinnerungsModus = "vorlauf" | "uhrzeit";

export function istErinnerungsModus(wert: string): wert is ErinnerungsModus {
  return wert === "vorlauf" || wert === "uhrzeit";
}

export type ErinnerungsEinstellung = {
  aktiv: boolean;
  modus: ErinnerungsModus;
  /** Gilt im Modus `vorlauf`: Stunden vor dem Termin. */
  stunden: number;
  /** Gilt im Modus `uhrzeit`: 0 = am Termintag, 1 = am Tag davor … */
  tage: number;
  /** Gilt im Modus `uhrzeit`: "09:00". */
  uhrzeit: string;
};

/** Die fünf Spalten einer Erinnerung als ein Objekt; Postgres liefert `time` als "09:00:00". */
export function erinnerungAus(
  aktiv: boolean,
  modus: ErinnerungsModus,
  stunden: number,
  tage: number,
  uhrzeit: string,
): ErinnerungsEinstellung {
  return { aktiv, modus, stunden, tage, uhrzeit: uhrzeit.slice(0, 5) };
}

/** Die Liste `erinnerungen_weitere` (JSON aus der Datenbank) als geprüfte Einstellungen. */
export function erinnerungenAusListe(wert: unknown): ErinnerungsEinstellung[] {
  if (!Array.isArray(wert)) return [];
  const liste: ErinnerungsEinstellung[] = [];
  for (const eintrag of wert) {
    if (!eintrag || typeof eintrag !== "object") continue;
    const e = eintrag as Record<string, unknown>;
    liste.push({
      aktiv: e.aktiv !== false,
      modus: e.modus === "uhrzeit" ? "uhrzeit" : "vorlauf",
      stunden: Number(e.stunden) || 24,
      tage: Number(e.tage) || 0,
      uhrzeit: typeof e.uhrzeit === "string" ? e.uhrzeit.slice(0, 5) : "09:00",
    });
  }
  return liste;
}

/** Muss zu den Migrationen 0006/0016/0017 passen (Spalten-Defaults und Check-Constraints). */
export const ERINNERUNG_STUNDEN_MAX = 336;
export const ERINNERUNG_TAGE_MAX = 14;
export const ERINNERUNG_WOCHEN_MAX = 2;
/** Höchstens fünf Erinnerungen je Termin: zwei feste Spaltenpaare plus drei in `erinnerungen_weitere`. */
export const ERINNERUNGEN_MAX = 5;

/** „2 Stunden vorher", „1 Tag vorher", „2 Wochen vorher", „Am Termintag, 09:00 Uhr". */
export function erinnerungSatz(e: ErinnerungsEinstellung): string {
  if (e.modus === "uhrzeit") return `${tagWort(e.tage)}, ${e.uhrzeit} Uhr`;
  const { zahl, einheit } = vorlaufTeile(e.stunden);
  return `${zahl} ${einheitWort(einheit, zahl)} vorher`;
}

export type VorlaufEinheit = "stunden" | "tage" | "wochen";

/** Stunden → die größte glatte Einheit: 48 → 2 Tage, 336 → 2 Wochen, 5 → 5 Stunden. */
export function vorlaufTeile(stunden: number): { zahl: number; einheit: VorlaufEinheit } {
  if (stunden >= 168 && stunden % 168 === 0) return { zahl: stunden / 168, einheit: "wochen" };
  if (stunden >= 24 && stunden % 24 === 0) return { zahl: stunden / 24, einheit: "tage" };
  return { zahl: stunden, einheit: "stunden" };
}

export function vorlaufStunden(zahl: number, einheit: VorlaufEinheit): number {
  const faktor = einheit === "wochen" ? 168 : einheit === "tage" ? 24 : 1;
  return Math.min(ERINNERUNG_STUNDEN_MAX, Math.max(1, zahl) * faktor);
}

/** Einzahl bei 1: „1 Stunde", sonst „2 Stunden". */
export function einheitWort(einheit: VorlaufEinheit, zahl: number): string {
  const worte = {
    stunden: ["Stunde", "Stunden"],
    tage: ["Tag", "Tage"],
    wochen: ["Woche", "Wochen"],
  } as const;
  return worte[einheit][zahl === 1 ? 0 : 1];
}

export function tagWort(tage: number): string {
  if (tage === 0) return "Am Termintag";
  if (tage === 1) return "1 Tag vorher";
  return `${tage} Tage vorher`;
}

/**
 * Vorgaben je Ort: Im Normalfall 1 Tag und 2 Stunden vorher. Beim
 * Telefontermin erinnert die erste Mail am Termintag um 9 Uhr und die zweite
 * eine Stunde vorher — ein Anruf braucht weniger Anlauf als ein Besuch.
 */
export function erinnerungsVorgaben(ort: Ort): [ErinnerungsEinstellung, ErinnerungsEinstellung] {
  if (ort === "telefon") {
    return [
      { aktiv: true, modus: "uhrzeit", stunden: 24, tage: 0, uhrzeit: "09:00" },
      { aktiv: true, modus: "vorlauf", stunden: 1, tage: 0, uhrzeit: "09:00" },
    ];
  }
  return [
    { aktiv: true, modus: "vorlauf", stunden: 24, tage: 0, uhrzeit: "09:00" },
    { aktiv: true, modus: "vorlauf", stunden: 2, tage: 0, uhrzeit: "09:00" },
  ];
}

/** Auswahl im Formular; die Vorgabe je Terminart kommt aus TERMINARTEN. */
export const DAUER_VORSCHLAEGE = [10, 30, 45, 60, 90, 120] as const;

export function dauerLabel(minuten: number): string {
  if (minuten < 60) return `${minuten} Min`;
  const stunden = minuten / 60;
  if (Number.isInteger(stunden)) return `${stunden} Std`;
  return `${stunden.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std`;
}

/* --------------------------------------------------------------------------
 * Nutzen — hängen an den Betreff jeder Mail zum Termin, damit der Kunde auf
 * den ersten Blick sieht, worum es geht. Höchstens drei, in gewählter
 * Reihenfolge. Eigene Nutzen des Vermittlers kommen aus `profiles.nutzen_eigene`.
 * ----------------------------------------------------------------------- */

export const NUTZEN_VORGABEN = [
  "Ganzheitliche Finanzberatung",
  "Berufseinstieg",
  "Investment",
  "Vorsorge-Check",
  "Bestands-Check",
  "Ruhestandsplanung",
  "Immobilienplan",
  "Einkommenssicherung",
  "Kindervorsorge",
  "Finanzplanung für die Familie",
] as const;

export const NUTZEN_MAX = 3;
export const NUTZEN_ZEICHEN_MAX = 40;

/** „Termin mit Mart Masangkay – Vorsorge-Check, Investment" */
export function betreffMitNutzen(betreff: string, nutzen: readonly string[]): string {
  const liste = nutzen.map((eintrag) => eintrag.trim()).filter(Boolean);
  return liste.length > 0 ? `${betreff} – ${liste.join(", ")}` : betreff;
}
