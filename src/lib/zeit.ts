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
const FRUEHESTE_STUNDE = 6;
const SPAETESTE_STUNDE = 22;

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
