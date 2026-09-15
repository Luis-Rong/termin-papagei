/**
 * Die Sprache, in der die Anwendung über Mails spricht — bewusst ohne ein
 * einziges Resend-Wort. Alles Resend-Spezifische liegt in `resend/`, und der
 * Rest der Anwendung kennt nur diese Typen und `mailVersenden` aus `index.ts`.
 *
 * Diese Datei darf nichts vom Server importieren.
 */

export type EmailNachricht = {
  an: string;
  betreff: string;
  /** Fertig zusammengebautes, gesäubertes HTML — inklusive Signatur. */
  html: string;
  /** Anzeigename im Absenderfeld, z. B. "Max Mustermann, Musterfinanz". */
  absenderName: string;
  /** Antworten landen beim Vermittler selbst, nicht bei der gemeinsamen Domain. */
  replyTo: string;
};

/**
 * Ergebnis eines Mail-Versands.
 *
 * `nicht_eingerichtet` ist ausdrücklich kein Fehler im Sinne von "kaputt" —
 * fehlt der API-Key, bleibt der Versand aus, aber ein Termin darf nie daran
 * scheitern (gleiche Philosophie wie beim Kalender).
 */
export type EmailErgebnis =
  | { status: "ok" }
  | { status: "nicht_eingerichtet" }
  | { status: "fehler"; meldung: string };
