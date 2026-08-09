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

/** Was ein `<input type="datetime-local">` liefert: "2026-08-12T14:30". */
const EINGABE_MUSTER = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

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
