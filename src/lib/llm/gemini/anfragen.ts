/**
 * Der Anfrage-Teil der Gemini-Anbindung: ein einziger HTTP-Aufruf.
 *
 * Bewusst ohne SDK (`@google/genai` o. Ä.): Gebraucht wird ein einzelner
 * Endpunkt, dafür lohnt kein zusätzliches Paket — dasselbe Prinzip wie bei
 * `googleapis` in `src/lib/kalender/google/`. Der Ort bleibt derselbe — alles
 * Gemini-Spezifische liegt hier unter `src/lib/llm/gemini/`.
 */

/**
 * Konfigurierbar statt hart codiert: Google benennt Gemini-Modelle regelmäßig
 * um oder stellt sie ein — ein Modellwechsel soll keine Codeänderung brauchen.
 * (Sep 2026: `gemini-2.5-flash` ist für neue Schlüssel abgeschaltet.)
 */
const STANDARD_MODELL = "gemini-3.8-flash";

/**
 * Ausweichmodell, wenn das Hauptmodell überlastet ist (503/429) — das kommt
 * bei neuen Modellen auf der Gratis-Stufe häufig vor und ist nach Sekunden
 * wieder vorbei. Für den Vermittler zählt, dass sein Klick funktioniert.
 */
const AUSWEICH_MODELL = "gemini-3.5-flash";

type GeminiAntwort = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

type Ergebnis = { text: string } | { fehler: string; ueberlastet: boolean };

async function anModell(apiKey: string, modell: string, prompt: string): Promise<Ergebnis> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modell}:generateContent?key=${apiKey}`;

  const antwort = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // Niedrige Temperatur: Formulierung darf variieren, Inhalt und Struktur
      // sollen so nah wie möglich an der Vorlage bleiben (siehe CLAUDE.md).
      generationConfig: { temperature: 0.3 },
    }),
    cache: "no-store",
  });

  const daten = (await antwort.json().catch(() => null)) as GeminiAntwort | null;

  if (!antwort.ok || !daten) {
    return {
      fehler: daten?.error?.message ?? `Gemini hat mit Status ${antwort.status} geantwortet.`,
      ueberlastet: antwort.status === 503 || antwort.status === 429,
    };
  }

  const text = daten.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { fehler: "Gemini hat keinen Text zurückgegeben.", ueberlastet: false };

  return { text };
}

/** Schickt den Prompt an Gemini und gibt den reinen Antworttext zurück. */
export async function geminiAnfrage(
  apiKey: string,
  prompt: string,
): Promise<{ text: string } | { fehler: string }> {
  const modell = process.env.GEMINI_MODEL?.trim() || STANDARD_MODELL;

  const ergebnis = await anModell(apiKey, modell, prompt);
  if ("text" in ergebnis || !ergebnis.ueberlastet || modell === AUSWEICH_MODELL) {
    return ergebnis;
  }
  return anModell(apiKey, AUSWEICH_MODELL, prompt);
}
