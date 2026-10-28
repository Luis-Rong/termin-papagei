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
  /** Nur bei ort = "anderer": „Straße 1, 12345 Ort". */
  adresse?: string | null;
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
  switch (termin.ort) {
    case "digital":
      return termin.meetLink ?? "Videotermin";
    case "telefon":
      return ORTE.telefon;
    case "anderer":
      return termin.adresse ?? ORTE.anderer;
    case "buero":
      return termin.firma ? `${ORTE.buero} — ${termin.firma}` : ORTE.buero;
  }
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

const MARINE = "#101E47";
const MARINE_MITTEL = "#364A7E";
const SCHRIFT = "'Trebuchet MS','Segoe UI',Tahoma,sans-serif";

/**
 * Ein Knopf nach CD 7, der auch in Outlook für Windows als Knopf erscheint
 * (Tabellenzelle statt CSS-Abstand am Link): Primär Marine mit weißer Schrift,
 * Sekundär mit 1,5-px-Linie in Marine Mittel. Radius 10 px, 44 px hoch.
 */
function knopf(ziel: string, text: string, gefuellt: boolean): string {
  const zelle = gefuellt
    ? `bgcolor="${MARINE}" style="border-radius:10px;background-color:${MARINE};padding:12px 24px;"`
    : `style="border-radius:10px;border:1.5px solid ${MARINE_MITTEL};padding:11px 23px;"`;
  const farbe = gefuellt ? "#ffffff" : MARINE;

  return (
    `<td ${zelle}>` +
    `<a href="${htmlEscapen(ziel)}" target="_blank" rel="noopener noreferrer" ` +
    `style="color:${farbe};text-decoration:none;font-weight:bold;font-size:16px;font-family:${SCHRIFT};white-space:nowrap;">${htmlEscapen(text)}</a>` +
    `</td><td width="16">&nbsp;</td>`
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
    ? `<p style="font-size:14px;color:${MARINE_MITTEL};margin:12px 0 0 0;font-family:${SCHRIFT};">Anderer Kalender (Apple, Outlook): ` +
      `<a href="${htmlEscapen(icsUrl(basis, token))}" target="_blank" rel="noopener noreferrer" style="color:${MARINE};">Kalenderdatei herunterladen</a></p>`
    : "";

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px 0;"><tr>${knoepfe}</tr></table>` +
    ics
  );
}
