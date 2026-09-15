/**
 * Die Sprache, in der die Anwendung über die Mail-Personalisierung spricht —
 * bewusst ohne ein einziges Gemini-Wort. Alles Gemini-Spezifische liegt in
 * `gemini/`, der Rest der Anwendung kennt nur `mailPersonalisieren` aus
 * `index.ts`.
 *
 * Diese Datei darf nichts vom Server importieren.
 */

/**
 * Die Werte, die schon in die Vorlage eingesetzt wurden, bevor das LLM sie
 * sieht — nie Finanzdaten oder Notizen (DSGVO, siehe CLAUDE.md).
 */
export type PersonalisierungsKontext = {
  vorname: string;
  terminart: string;
  datum: string;
  uhrzeit: string;
  ort: string;
};
