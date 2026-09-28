/**
 * Bausteine der Terminbestätigung, die Terminseite, Terminliste und Server
 * Actions gemeinsam brauchen — damit die Vorschau genau das zeigt, was später
 * verschickt wird (Betreff, Absender, Signatur).
 *
 * Diese Datei ruft nichts auf und lädt nichts; die Abfragen liegen bei den
 * Aufrufern.
 */

import { versandHtml } from "@/lib/html-sicherheit";
import { ORT_IM_SATZ, terminartLabel, type Ort } from "@/lib/termine/terminarten";
import {
  betreffErsetzen,
  type GeladeneVorlage,
  type PlatzhalterWerte,
} from "@/lib/vorlagen/abfragen";
import { formatiereDatum, formatiereUhrzeit } from "@/lib/zeit";

/** Wandelt einen Termin in die Platzhalterwerte für die Vorlage um. */
export function platzhalterWerte(
  zeile: { location: Ort; starts_at: string },
  kunde: { vorname: string },
): PlatzhalterWerte {
  return {
    vorname: kunde.vorname,
    datum: formatiereDatum(zeile.starts_at),
    uhrzeit: formatiereUhrzeit(zeile.starts_at),
    ort: ORT_IM_SATZ[zeile.location],
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

/** Betreff der Bestätigung — aus der Vorlage, sonst ein schlichter Standard. */
export function bestaetigungBetreff(
  vorlage: GeladeneVorlage | null,
  terminart: string,
  werte: PlatzhalterWerte,
): string {
  return vorlage
    ? betreffErsetzen(vorlage.betreff, werte)
    : `Terminbestätigung — ${terminartLabel(terminart)}`;
}

/** Betreff einer Kunden-Erinnerung — aus der Vorlage, sonst ein schlichter Standard. */
export function erinnerungBetreff(
  vorlage: GeladeneVorlage | null,
  terminart: string,
  werte: PlatzhalterWerte,
): string {
  return vorlage
    ? betreffErsetzen(vorlage.betreff, werte)
    : `Erinnerung an Ihren Termin — ${terminartLabel(terminart)} am ${werte.datum}`;
}

type AbsenderProfil = {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string;
};

/** Der Anzeigename im Postfach des Kunden: "Vorname Nachname, Firma". */
export function absenderName(profil: AbsenderProfil): string {
  const name =
    [profil.first_name, profil.last_name].filter(Boolean).join(" ").trim() ||
    profil.email;
  return profil.company ? `${name}, ${profil.company}` : name;
}

/** Entwurf plus Signatur — genau so geht die Mail raus. */
export function mailMitSignatur(entwurfHtml: string, signatur: string | null): string {
  return versandHtml(entwurfHtml + (signatur ? `<br><br>${signatur}` : ""));
}

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
