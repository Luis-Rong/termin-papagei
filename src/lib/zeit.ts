import { de } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Alle Termine dieser Anwendung laufen in deutscher Zeit — auch dann, wenn der
 * Laptop des Vermittlers auf einer anderen Zeitzone steht. Deshalb wird jede
 * eingegebene Uhrzeit hier ausdrücklich als Europe/Berlin gelesen und nie über
 * die Zeitzone des Browsers.
 *
 * Diese Datei ist die einzige Stelle, die `date-fns-tz` kennt. Ein Wechsel der
 * Bibliothek bleibt damit eine Ein-Datei-Änderung.
 */
export const ZEITZONE = "Europe/Berlin";

/** Das Format, in dem Datum und Uhrzeit zusammen verarbeitet werden. */
const EINGABE_MUSTER = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Termine werden im Viertelstundentakt geplant — niemand lädt zu 9:58 ein.
 * Die Uhrzeit ist deshalb eine Auswahlliste und kein freies Feld.
 */
export const ZEIT_SCHRITT_MINUTEN = 15;

/** Von wann bis wann Uhrzeiten zur Auswahl stehen (deutsche Zeit). */
export const FRUEHESTE_STUNDE = 6;
export const SPAETESTE_STUNDE = 22;

/** Die Stunden fürs Uhrzeit-Rad: 06 … 22. */
export const STUNDEN_AUSWAHL: string[] = Array.from(
  { length: SPAETESTE_STUNDE - FRUEHESTE_STUNDE + 1 },
  (_, i) => String(FRUEHESTE_STUNDE + i).padStart(2, "0"),
);

/** Die Minuten fürs Uhrzeit-Rad: 00, 15, 30, 45. */
export const MINUTEN_AUSWAHL: string[] = Array.from(
  { length: 60 / ZEIT_SCHRITT_MINUTEN },
  (_, i) => String(i * ZEIT_SCHRITT_MINUTEN).padStart(2, "0"),
);

/** Erlaubtes Format einer Uhrzeit: "09:30". */
export const UHRZEIT_MUSTER = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Macht aus dem, was jemand tippt, eine Uhrzeit: "9" → "09:00", "930" und
 * "9.30" → "09:30", "1430" → "14:30". Null, wenn nichts Brauchbares drinsteht.
 */
export function normalisiereUhrzeit(eingabe: string): string | null {
  const ziffern = eingabe.replace(/[^\d]/g, "");
  if (!ziffern || ziffern.length > 4) return null;

  let stunde: number;
  let minute: number;
  if (/[:.,h]/.test(eingabe)) {
    const [h = "", m = ""] = eingabe.split(/[:.,h]/);
    stunde = Number(h.replace(/\D/g, ""));
    minute = m ? Number(m.replace(/\D/g, "").padEnd(2, "0").slice(0, 2)) : 0;
  } else if (ziffern.length <= 2) {
    stunde = Number(ziffern);
    minute = 0;
  } else {
    stunde = Number(ziffern.slice(0, ziffern.length - 2));
    minute = Number(ziffern.slice(-2));
  }

  if (!Number.isInteger(stunde) || !Number.isInteger(minute)) return null;
  if (stunde < 0 || stunde > 23 || minute < 0 || minute > 59) return null;
  return `${String(stunde).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export const ZEIT_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (
    let minute = FRUEHESTE_STUNDE * 60;
    minute <= SPAETESTE_STUNDE * 60;
    minute += ZEIT_SCHRITT_MINUTEN
  ) {
    const stunde = String(Math.floor(minute / 60)).padStart(2, "0");
    slots.push(`${stunde}:${String(minute % 60).padStart(2, "0")}`);
  }
  return slots;
})();

/** "2026-08-12T14:30" → { datum: "2026-08-12", uhrzeit: "14:30" } */
export function teileZeitpunkt(wert: string): {
  datum: string;
  uhrzeit: string;
} {
  const [datum = "", uhrzeit = ""] = wert.split("T");
  return { datum, uhrzeit };
}

/** Gegenstück: die beiden Formularfelder wieder zusammensetzen. */
export function fuegeZeitpunktZusammen(datum: string, uhrzeit: string): string {
  return datum && uhrzeit ? `${datum}T${uhrzeit}` : "";
}

/**
 * Die folgenden drei Funktionen arbeiten mit einem reinen Kalenderdatum
 * ("2026-08-12") und rechnen bewusst NICHT in Zeitzonen um: Ein Datum ohne
 * Uhrzeit ist kein Zeitpunkt. Würde man es umrechnen, läge der 12. um
 * Mitternacht je nach Zeitzone plötzlich auf dem 11.
 */

/** "2026-08-12" → "Mi., 12.08.2026" */
export function formatiereDatumsWert(datum: string): string {
  const tag = alsKalenderTag(datum);
  if (!tag) return "";

  return tag.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Ein im Kalender angeklickter Tag als "2026-08-12". */
export function alsDatumsWert(tag: Date): string {
  const monat = String(tag.getMonth() + 1).padStart(2, "0");
  const tagImMonat = String(tag.getDate()).padStart(2, "0");
  return `${tag.getFullYear()}-${monat}-${tagImMonat}`;
}

/** "2026-08-12" als Date — auf die Mittagszeit gelegt, das ist am robustesten. */
export function alsKalenderTag(datum: string): Date | undefined {
  const [jahr, monat, tag] = datum.split("-").map(Number);
  if (!jahr || !monat || !tag) return undefined;
  return new Date(jahr, monat - 1, tag, 12);
}

/**
 * Wandelt die Eingabe aus dem Formular in einen echten Zeitpunkt um.
 * Gibt null zurück, wenn nichts Brauchbares drinsteht.
 */
export function eingabeAlsZeitpunkt(wert: string): Date | null {
  if (!EINGABE_MUSTER.test(wert)) return null;

  const zeitpunkt = fromZonedTime(wert, ZEITZONE);
  return Number.isNaN(zeitpunkt.getTime()) ? null : zeitpunkt;
}

/** Umgekehrter Weg: Zeitpunkt als Vorbelegung für das Eingabefeld. */
export function zeitpunktAlsEingabe(zeitpunkt: string | Date): string {
  return formatInTimeZone(zeitpunkt, ZEITZONE, "yyyy-MM-dd'T'HH:mm");
}

/** "Dienstag, 28.10.2026" — der heutige Tag für die Übersicht. */
export function heute(): string {
  return formatInTimeZone(new Date(), ZEITZONE, "EEEE, dd.MM.yyyy", { locale: de });
}

/** "Mi." — nur der Wochentag, für die Datumsspalte einer Liste. */
export function formatiereWochentag(zeitpunkt: string | Date): string {
  return formatInTimeZone(zeitpunkt, ZEITZONE, "EEEEEE", { locale: de });
}

/** "12.08.2026" — ohne Wochentag. */
export function formatiereTag(zeitpunkt: string | Date): string {
  return formatInTimeZone(zeitpunkt, ZEITZONE, "dd.MM.yyyy", { locale: de });
}

/**
 * Der Tag, wie er im Betreff steht: „Dienstag" — und nur wenn es nicht der
 * nächste Dienstag ist, zusätzlich „, den 11.11.". So weiß der Kunde beim
 * ersten Blick, ob es diese Woche ist.
 */
export function tagImSatz(beginn: string | Date, jetzt: Date = new Date()): string {
  const wochentag = formatInTimeZone(beginn, ZEITZONE, "EEEE", { locale: de });
  const heuteTag = alsKalenderTag(formatInTimeZone(jetzt, ZEITZONE, "yyyy-MM-dd"))!;
  const terminTag = alsKalenderTag(formatInTimeZone(beginn, ZEITZONE, "yyyy-MM-dd"))!;
  const tageBis = Math.round((terminTag.getTime() - heuteTag.getTime()) / 86_400_000);

  if (tageBis >= 0 && tageBis <= 7) return wochentag;
  return `${wochentag}, den ${formatInTimeZone(beginn, ZEITZONE, "dd.MM.")}`;
}

/**
 * Ein Zeitpunkt relativ zum Termintag: `tageVorher` Tage vor dem Tag des
 * Beginns, um `uhrzeit` deutscher Zeit — für Erinnerungen „am Termintag um
 * 9:00" oder „1 Tag vorher um 18:00".
 */
export function zeitpunktAmTag(beginn: string | Date, tageVorher: number, uhrzeit: string): Date {
  const tag = alsKalenderTag(formatInTimeZone(beginn, ZEITZONE, "yyyy-MM-dd"))!;
  tag.setDate(tag.getDate() - tageVorher);
  return fromZonedTime(`${alsDatumsWert(tag)}T${uhrzeit}`, ZEITZONE);
}

/** "Mi., 12.08.2026" */
export function formatiereDatum(zeitpunkt: string | Date): string {
  return formatInTimeZone(zeitpunkt, ZEITZONE, "EEEEEE, dd.MM.yyyy", {
    locale: de,
  });
}

/** "14:30" */
export function formatiereUhrzeit(zeitpunkt: string | Date): string {
  return formatInTimeZone(zeitpunkt, ZEITZONE, "HH:mm", { locale: de });
}

/** "Mi., 12.08.2026, 14:30 – 16:00 Uhr" */
export function formatiereZeitraum(
  beginn: string | Date,
  ende: string | Date,
): string {
  return `${formatiereDatum(beginn)}, ${formatiereUhrzeit(beginn)} – ${formatiereUhrzeit(ende)} Uhr`;
}

/** Länge eines Termins in Minuten — für die Dauer-Auswahl im Formular. */
export function dauerInMinuten(
  beginn: string | Date,
  ende: string | Date,
): number {
  const von = new Date(beginn).getTime();
  const bis = new Date(ende).getTime();
  return Math.round((bis - von) / 60_000);
}

/** Neuer Zeitpunkt, um die angegebenen Minuten später. */
export function plusMinuten(zeitpunkt: Date, minuten: number): Date {
  return new Date(zeitpunkt.getTime() + minuten * 60_000);
}

/**
 * Vorbelegung für einen neuen Termin: morgen um 10:00 deutscher Zeit. Besser
 * als "jetzt", weil ein Termin so gut wie nie in der laufenden Stunde liegt.
 */
export function naechsterTerminVorschlag(): string {
  const morgen = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${formatInTimeZone(morgen, ZEITZONE, "yyyy-MM-dd")}T10:00`;
}
