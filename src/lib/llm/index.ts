/**
 * Das LLM, wie die Anwendung es sieht: nur noch `hinweisEinarbeiten`. Dass
 * dahinter Gemini steckt, steht ausschließlich in `gemini/` — außerhalb von
 * `src/lib/llm/` taucht kein Gemini-Aufruf und kein API-Key auf.
 *
 * Entschieden Sep 2026: Die Mail entsteht standardmäßig ohne KI, rein aus der
 * Vorlage (Platzhalter ersetzt). Das LLM kommt nur auf Knopfdruck zum Einsatz,
 * wenn der Vermittler einen persönlichen Hinweis in die Mail einarbeiten
 * lassen will — und das Ergebnis sieht er vor dem Versand.
 *
 * Grundregel: Diese Funktion wirft nie. Passt die Antwort strukturell nicht
 * mehr zur Mail, gibt es eine Fehlermeldung statt einer kaputten Mail.
 */

import { geminiAnfrage } from "./gemini/anfragen";
import type { MailKontext } from "./typen";

export type { MailKontext } from "./typen";

/** Ohne API-Key gibt es den KI-Knopf nicht — alles andere läuft unverändert. */
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
 * Prüft, ob die Antwort strukturell noch zur Mail passt: gleiche Anzahl
 * Bild-/Link-Tags, und die bereits eingesetzten Termindaten kommen
 * unverändert vor.
 */
function strukturPasstNoch(
  vorher: string,
  antwort: string,
  kontext: MailKontext,
): boolean {
  if (zaehle(antwort, /<img\b/gi) !== zaehle(vorher, /<img\b/gi)) return false;
  if (zaehle(antwort, /<a\b/gi) !== zaehle(vorher, /<a\b/gi)) return false;

  const werte = [kontext.datum, kontext.uhrzeit, kontext.ort];
  return werte.every((wert) => !wert || !vorher.includes(wert) || antwort.includes(wert));
}

function prompt(mailHtml: string, hinweis: string, kontext: MailKontext): string {
  return `Du arbeitest einen kurzen Hinweis eines Finanz-/Versicherungsvermittlers in eine fertige Terminbestätigungs-Mail an seinen Kunden ein.

Regeln, die du NIE brichst:
- Baue den Inhalt des Hinweises sinngemäß an passender Stelle ein — als Satz oder kurzen Absatz, im Ton und in der Anrede der Mail (Du oder Sie).
- Der übrige Text der Mail bleibt wörtlich unverändert.
- Verändere oder entferne kein HTML-Tag, kein Attribut, keine Bild- oder Link-Adresse. Einen neuen Absatz schreibst du als <p>…</p>.
- Verändere nie Datum ("${kontext.datum}"), Uhrzeit ("${kontext.uhrzeit}") oder Ort ("${kontext.ort}").
- Ergänze keine Grußformel und keine Signatur — die hängt automatisch darunter.
- Erfinde nichts, was weder im Hinweis noch in der Mail steht.
- Antworte ausschließlich mit dem fertigen HTML, ohne Erklärung, ohne Markdown-Codeblock.

Terminart: ${kontext.terminart}

Hinweis des Vermittlers:
${hinweis}

Mail (HTML):
${mailHtml}`;
}

/**
 * Arbeitet `hinweis` in die schon fertige Mail ein. Liefert das neue HTML oder
 * eine Meldung, die dem Vermittler direkt angezeigt werden kann.
 */
export async function hinweisEinarbeiten(
  mailHtml: string,
  hinweis: string,
  kontext: MailKontext,
): Promise<{ html: string } | { fehler: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { fehler: "Die KI ist nicht eingerichtet (GEMINI_API_KEY fehlt in .env.local)." };
  }

  try {
    const ergebnis = await geminiAnfrage(apiKey, prompt(mailHtml, hinweis, kontext));
    if ("fehler" in ergebnis) {
      return { fehler: `Die KI hat nicht geantwortet: ${ergebnis.fehler}` };
    }

    const antwort = codeblockEntfernen(ergebnis.text);
    if (!strukturPasstNoch(mailHtml, antwort, kontext)) {
      return {
        fehler:
          "Die KI hat mehr verändert als erlaubt — die Mail bleibt deshalb unverändert. Bitte noch einmal versuchen oder den Hinweis selbst einfügen.",
      };
    }
    return { html: antwort };
  } catch {
    return { fehler: "Die KI ist gerade nicht erreichbar. Bitte später noch einmal versuchen." };
  }
}
