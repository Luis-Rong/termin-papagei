/**
 * Die Mail-Personalisierung, wie die Anwendung sie sieht: nur noch
 * `mailPersonalisieren`. Dass dahinter Gemini steckt, steht ausschließlich in
 * `gemini/` — außerhalb von `src/lib/llm/` taucht kein Gemini-Aufruf und kein
 * API-Key auf.
 *
 * Grundregel: Diese Funktion wirft nie und liefert im Zweifel lieber die
 * unveränderte Vorlage zurück, als eine kaputt personalisierte Mail
 * rauszulassen — dieselbe Philosophie wie beim Kalender ("ein Kalenderfehler
 * bricht nie einen Termin ab").
 */

import { geminiAnfrage } from "./gemini/anfragen";
import type { PersonalisierungsKontext } from "./typen";

export type { PersonalisierungsKontext } from "./typen";

/** Ohne API-Key bleibt die Personalisierung aus — die Vorlage geht unverändert raus. */
export function llmEingerichtet(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function zaehle(html: string, muster: RegExp): number {
  return html.match(muster)?.length ?? 0;
}

/**
 * Manche Antworten kommen in einen Markdown-Codeblock verpackt
 * (```html … ```), obwohl der Prompt reines HTML verlangt.
 */
function codeblockEntfernen(text: string): string {
  const treffer = text.trim().match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  return (treffer ? treffer[1] : text).trim();
}

/**
 * Prüft, ob die Antwort strukturell noch zur Vorlage passt: gleiche Anzahl
 * Bild-/Link-Tags, und die bereits eingesetzten Platzhalterwerte kommen
 * unverändert vor. Nur dann gilt die Personalisierung als sicher genug, um
 * verschickt zu werden.
 */
function strukturPasstNoch(
  vorlage: string,
  antwort: string,
  kontext: PersonalisierungsKontext,
): boolean {
  if (zaehle(antwort, /<img\b/gi) !== zaehle(vorlage, /<img\b/gi)) return false;
  if (zaehle(antwort, /<a\b/gi) !== zaehle(vorlage, /<a\b/gi)) return false;

  const werte = [kontext.vorname, kontext.datum, kontext.uhrzeit, kontext.ort];
  return werte.every((wert) => !wert || antwort.includes(wert));
}

function prompt(vorlageHtml: string, kontext: PersonalisierungsKontext): string {
  return `Du personalisierst eine Terminbestätigungs-Mail für einen Finanz-/Versicherungsvermittler.

Regeln, die du NIE brichst:
- Ändere ausschließlich die Formulierung des Fließtexts.
- Verändere kein einziges HTML-Tag, kein Attribut, keine Bild- oder Link-Adresse.
- Verändere nie die schon eingesetzten Werte Name ("${kontext.vorname}"), Datum ("${kontext.datum}"), Uhrzeit ("${kontext.uhrzeit}") oder Ort ("${kontext.ort}") — sie stehen bereits richtig in der Vorlage.
- Erfinde keine neuen Inhalte, Zusagen oder Details dazu.
- Antworte ausschließlich mit dem fertigen HTML, ohne Erklärung, ohne Markdown-Codeblock.

Terminart: ${kontext.terminart}

Vorlage (HTML):
${vorlageHtml}`;
}

/**
 * Personalisiert eine Vorlage, die schon mit den echten Termindaten gefüllt
 * ist. Bei fehlendem API-Key, einem Gemini-Fehler oder einer strukturell
 * verdächtigen Antwort kommt unverändert `vorlageHtml` zurück.
 */
export async function mailPersonalisieren(
  vorlageHtml: string,
  kontext: PersonalisierungsKontext,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return vorlageHtml;

  try {
    const ergebnis = await geminiAnfrage(apiKey, prompt(vorlageHtml, kontext));
    if ("fehler" in ergebnis) return vorlageHtml;

    const antwort = codeblockEntfernen(ergebnis.text);
    return strukturPasstNoch(vorlageHtml, antwort, kontext) ? antwort : vorlageHtml;
  } catch {
    return vorlageHtml;
  }
}
