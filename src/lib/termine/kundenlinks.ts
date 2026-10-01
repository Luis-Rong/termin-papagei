/**
 * Was der Kunde in der Bestätigungsmail anklicken kann: Termin in den eigenen
 * Kalender übernehmen und den Termin zusagen.
 *
 * - Der Google-Kalender-Link ist eine reine Google-Adresse und funktioniert
 *   immer — auch wenn die Anwendung nur lokal läuft.
 * - Zusage-Link und Kalenderdatei (.ics) zeigen auf die Anwendung selbst und
 *   brauchen deshalb eine öffentlich erreichbare Adresse (`oeffentlicheBasis`).
 *
 * Reine Text-/Rechenlogik ohne Abfragen; nur auf dem Server verwendet.
 */

import { ORTE, terminartLabel, type Ort } from "@/lib/termine/terminarten";
import { htmlEscapen } from "@/lib/vorlagen/abfragen";

export type KundenTermin = {
  terminart: string;
  ort: Ort;
  beginn: string;
  ende: string;
  meetLink: string | null;
  /** "Vorname Nachname" des Vermittlers. */
  vermittler: string;
  firma: string | null;
};

/** Titel des Termins aus Sicht des Kunden. */
export function kundenTerminTitel(termin: KundenTermin): string {
  const art = terminartLabel(termin.terminart);
  return termin.vermittler ? `${art} mit ${termin.vermittler}` : art;
}

function kundenTerminOrt(termin: KundenTermin): string {
  if (termin.ort === "digital") return termin.meetLink ?? "Videotermin";
  return termin.firma ? `${ORTE.buero} — ${termin.firma}` : ORTE.buero;
}

function kundenTerminBeschreibung(termin: KundenTermin): string {
  return termin.ort === "digital" && termin.meetLink
    ? `Link zum Videotermin: ${termin.meetLink}`
    : "";
}

/** 20261006T080000Z — das Format, das Google und .ics für Zeitpunkte erwarten. */
function kalenderZeit(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Öffnet bei Google einen vorausgefüllten Kalendereintrag — ohne Anmeldung bei uns. */
export function googleKalenderLink(termin: KundenTermin): string {
  const parameter = new URLSearchParams({
    action: "TEMPLATE",
    text: kundenTerminTitel(termin),
    dates: `${kalenderZeit(termin.beginn)}/${kalenderZeit(termin.ende)}`,
    location: kundenTerminOrt(termin),
    ctz: "Europe/Berlin",
  });
  const beschreibung = kundenTerminBeschreibung(termin);
  if (beschreibung) parameter.set("details", beschreibung);

  return `https://calendar.google.com/calendar/render?${parameter.toString()}`;
}

/** Text in einer .ics-Datei: Komma, Semikolon, Backslash und Zeilenumbruch maskieren. */
function icsText(wert: string): string {
  return wert
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\r?\n/g, "\\n");
}

/** Kalenderdatei für Apple Kalender, Outlook und alle anderen Programme. */
export function icsDatei(termin: KundenTermin, uid: string, jetzt = new Date()): string {
  const zeilen = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Termin Papagei//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@termin-papagei`,
    `DTSTAMP:${kalenderZeit(jetzt.toISOString())}`,
    `DTSTART:${kalenderZeit(termin.beginn)}`,
    `DTEND:${kalenderZeit(termin.ende)}`,
    `SUMMARY:${icsText(kundenTerminTitel(termin))}`,
    `LOCATION:${icsText(kundenTerminOrt(termin))}`,
  ];
  const beschreibung = kundenTerminBeschreibung(termin);
  if (beschreibung) zeilen.push(`DESCRIPTION:${icsText(beschreibung)}`);
  zeilen.push("END:VEVENT", "END:VCALENDAR");

  return zeilen.join("\r\n") + "\r\n";
}

/**
 * Die Adresse, unter der Kunden die Anwendung erreichen — oder null, wenn es
 * keine gibt. `APP_URL` gewinnt; ohne sie gilt die Adresse der aktuellen
 * Anfrage, außer sie ist nur lokal erreichbar (dann wären die Links in der
 * Mail für den Kunden tot). In der Entwicklung bleibt localhost erlaubt,
 * damit sich die Links testen lassen.
 */
export function oeffentlicheBasis(anfrageHerkunft: string): string | null {
  const fest = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fest) return fest;

  const lokal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(anfrageHerkunft);
  return lokal && process.env.NODE_ENV === "production" ? null : anfrageHerkunft;
}

export function zusageUrl(basis: string, token: string): string {
  return `${basis}/zusage/${token}`;
}

export function icsUrl(basis: string, token: string): string {
  return `${basis}/zusage/${token}/termin.ics`;
}

const DUNKELBLAU = "#101E47";

/** Ein Knopf, der auch in Outlook für Windows als Knopf erscheint (Tabellenzelle statt CSS-Abstand am Link). */
function knopf(ziel: string, text: string, gefuellt: boolean): string {
  const zelle = gefuellt
    ? `bgcolor="${DUNKELBLAU}" style="border-radius:6px;background-color:${DUNKELBLAU};padding:10px 18px;"`
    : `style="border-radius:6px;border:1px solid ${DUNKELBLAU};padding:9px 17px;"`;
  const farbe = gefuellt ? "#ffffff" : DUNKELBLAU;

  return (
    `<td ${zelle}>` +
    `<a href="${htmlEscapen(ziel)}" target="_blank" rel="noopener noreferrer" ` +
    `style="color:${farbe};text-decoration:none;font-weight:bold;font-size:14px;">${htmlEscapen(text)}</a>` +
    `</td><td width="10">&nbsp;</td>`
  );
}

/**
 * Der Block mit den Knöpfen, der zwischen Mailtext und Signatur steht. Von
 * uns erzeugt, nicht vom Nutzer — deshalb läuft er nicht durch die
 * HTML-Säuberung (die würde die Knopf-Gestaltung entfernen).
 */
export function kundenAktionenHtml(
  termin: KundenTermin,
  token: string,
  basis: string | null,
  zugesagt: boolean,
): string {
  const knoepfe = [
    basis && !zugesagt ? knopf(zusageUrl(basis, token), "Termin zusagen", true) : "",
    knopf(googleKalenderLink(termin), "In Google Kalender eintragen", !(basis && !zugesagt)),
  ].join("");

  const ics = basis
    ? `<p style="font-size:12px;color:#666666;margin:8px 0 0 0;">Anderer Kalender (Apple, Outlook): ` +
      `<a href="${htmlEscapen(icsUrl(basis, token))}" target="_blank" rel="noopener noreferrer" style="color:${DUNKELBLAU};">Kalenderdatei herunterladen</a></p>`
    : "";

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 4px 0;"><tr>${knoepfe}</tr></table>` +
    ics
  );
}
