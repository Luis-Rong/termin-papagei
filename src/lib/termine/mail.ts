/**
 * Bausteine der Kundenmails, die Terminseite, Terminliste, Server Actions und
 * Erinnerungs-Job gemeinsam brauchen — damit die Vorschau genau das zeigt,
 * was später verschickt wird (Betreff, Absender, Signatur).
 *
 * Diese Datei ruft nichts auf und lädt nichts; die Abfragen liegen bei den
 * Aufrufern.
 */

import { versandHtml } from "@/lib/html-sicherheit";
import {
  adresseZusammen,
  betreffMitNutzen,
  ortImSatz,
  terminartLabel,
  type Ort,
} from "@/lib/termine/terminarten";
import {
  betreffErsetzen,
  type GeladeneVorlage,
  type PlatzhalterWerte,
} from "@/lib/vorlagen/abfragen";
import { ANREDE_TITEL, type Anrede, type AnredeTitel } from "@/lib/vorlagen/typen";
import { formatiereDatum, formatiereUhrzeit, tagImSatz } from "@/lib/zeit";

/** Der Kunde, soweit die Vorlage ihn braucht. */
export type MailKunde = {
  vorname: string;
  nachname: string;
  anrede: Anrede;
  anredeTitel: AnredeTitel | null;
};

/** Der Termin, soweit die Vorlage ihn braucht. */
export type MailTermin = {
  location: Ort;
  starts_at: string;
  ort_strasse?: string | null;
  ort_plz_ort?: string | null;
};

/** „Frau Mustermann" beim Sie, sonst der Vorname. */
export function anredeName(kunde: MailKunde): string {
  if (kunde.anrede === "sie") {
    const titel = kunde.anredeTitel ? ANREDE_TITEL[kunde.anredeTitel] : "";
    return [titel, kunde.nachname].filter(Boolean).join(" ");
  }
  return kunde.vorname;
}

/** Wandelt einen Termin in die Platzhalterwerte für die Vorlage um. */
export function platzhalterWerte(
  zeile: MailTermin,
  kunde: MailKunde,
  berater: string,
  jetzt: Date = new Date(),
): PlatzhalterWerte {
  return {
    vorname: kunde.vorname,
    nachname: kunde.nachname,
    anrede: anredeName(kunde),
    berater,
    tag: tagImSatz(zeile.starts_at, jetzt),
    datum: formatiereDatum(zeile.starts_at),
    uhrzeit: formatiereUhrzeit(zeile.starts_at),
    ort: ortImSatz(
      zeile.location,
      adresseZusammen(zeile.ort_strasse ?? null, zeile.ort_plz_ort ?? null),
    ),
  };
}

/** Der Meet-Link gehört nicht in einen Platzhalter (der wird HTML-escaped), sondern als eigener Absatz dahinter. */
export function mitMeetLink(
  html: string,
  zeile: { location: Ort; meet_link: string | null },
): string {
  if (zeile.location !== "digital" || !zeile.meet_link) return html;
  return `${html}<p>Link zum Videotermin: <a href="${zeile.meet_link}">${zeile.meet_link}</a></p>`;
}

/** Betreff der Bestätigung — aus der Vorlage, sonst ein schlichter Standard; die Nutzen hinten dran. */
export function bestaetigungBetreff(
  vorlage: GeladeneVorlage | null,
  terminart: string,
  werte: PlatzhalterWerte,
  nutzen: readonly string[] = [],
): string {
  const kern = vorlage
    ? betreffErsetzen(vorlage.betreff, werte)
    : `Terminbestätigung: ${terminartLabel(terminart)}`;
  return betreffMitNutzen(kern, nutzen);
}

/** Betreff einer Kunden-Erinnerung — aus der Vorlage, sonst ein schlichter Standard; die Nutzen hinten dran. */
export function erinnerungBetreff(
  vorlage: GeladeneVorlage | null,
  terminart: string,
  werte: PlatzhalterWerte,
  nutzen: readonly string[] = [],
): string {
  const kern = vorlage
    ? betreffErsetzen(vorlage.betreff, werte)
    : `Erinnerung: ${terminartLabel(terminart)} am ${werte.datum}`;
  return betreffMitNutzen(kern, nutzen);
}

type AbsenderProfil = {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string;
};

/** „Vorname Nachname" des Beraters — für {{berater}}. */
export function beraterName(profil: { first_name: string | null; last_name: string | null }): string {
  return [profil.first_name, profil.last_name].filter(Boolean).join(" ").trim();
}

/** Der Anzeigename im Postfach des Kunden: "Vorname Nachname, Firma". */
export function absenderName(profil: AbsenderProfil): string {
  const name = beraterName(profil) || profil.email;
  return profil.company ? `${name}, ${profil.company}` : name;
}

/**
 * Entwurf, Knöpfe für den Kunden (optional) und Signatur — genau so geht die
 * Mail raus. `aktionenHtml` erzeugen wir selbst (`kundenAktionenHtml`), es
 * läuft deshalb nicht durch die Säuberung.
 */
export function mailMitSignatur(
  entwurfHtml: string,
  signatur: string | null,
  aktionenHtml = "",
): string {
  return (
    `<div style="${MAIL_RAHMEN}">` +
    versandHtml(entwurfHtml) +
    aktionenHtml +
    (signatur ? `<br><br>${versandHtml(signatur)}` : "") +
    "</div>"
  );
}

/**
 * Schrift und Farbe der Mail wie im Corporate Design: Trebuchet, 16 px,
 * Marine. Nur Inline-Stil, damit jedes Postfach ihn versteht.
 */
const MAIL_RAHMEN =
  "font-family:'Trebuchet MS','Segoe UI',Tahoma,sans-serif;font-size:16px;line-height:1.6;color:#101E47;";

export type BestaetigungsStand = "offen" | "geaendert" | null;

/**
 * Muss die Bestätigung (noch einmal) raus? "offen": nie verschickt.
 * "geaendert": verschickt, aber der Entwurf wurde danach geändert — etwa weil
 * der Termin verschoben wurde.
 */
export function bestaetigungsStand(
  entwurfVorhanden: boolean,
  entwurfAm: string | null,
  zuletztVerschickt: string | null,
): BestaetigungsStand {
  if (!entwurfVorhanden) return null;
  if (!zuletztVerschickt) return "offen";
  if (entwurfAm && new Date(entwurfAm) > new Date(zuletztVerschickt)) return "geaendert";
  return null;
}
