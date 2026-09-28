/**
 * Die Sprache, in der die Anwendung über das LLM spricht — bewusst ohne ein
 * einziges Gemini-Wort. Alles Gemini-Spezifische liegt in `gemini/`, der Rest
 * der Anwendung kennt nur `hinweisEinarbeiten` aus `index.ts`.
 *
 * Diese Datei darf nichts vom Server importieren.
 */

/**
 * Die Werte, die schon in der Mail stehen, bevor das LLM sie sieht — nie
 * Finanzdaten (DSGVO, siehe CLAUDE.md). Der Hinweis selbst kommt vom
 * Vermittler und wird ihm gegenüber entsprechend beschriftet.
 */
export type MailKontext = {
  vorname: string;
  terminart: string;
  datum: string;
  uhrzeit: string;
  ort: string;
};
