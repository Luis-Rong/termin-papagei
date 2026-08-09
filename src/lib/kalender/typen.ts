/**
 * Die Sprache, in der die Anwendung über Kalender spricht — bewusst ohne ein
 * einziges Google-Wort. Alles Google-Spezifische liegt in `google/`, und der
 * Rest der Anwendung kennt nur diese Typen und die Funktionen aus `index.ts`.
 *
 * Diese Datei darf nichts vom Server importieren.
 */

export type KalenderTermin = {
  /** Vorhandener Kalendereintrag: dann wird aktualisiert statt neu angelegt. */
  eventId: string | null;
  titel: string;
  beschreibung?: string | null;
  /** ISO-Zeitpunkte oder Date; die Zeitzone kommt aus src/lib/zeit.ts. */
  beginn: string | Date;
  ende: string | Date;
  /** Digitale Termine bekommen einen Konferenzlink (bei Google: Meet). */
  digital: boolean;
  /** Anzeigeort für Termine im Büro. */
  ort?: string | null;
  /** Weitere Teilnehmer als E-Mail-Adressen, z. B. der Vertriebspartner. */
  teilnehmer?: string[];
  /** Ist bereits ein Konferenzlink vergeben? Verhindert einen zweiten. */
  meetLink?: string | null;
};

/**
 * Ergebnis eines Kalender-Aufrufs.
 *
 * `nicht_verbunden` ist ausdrücklich kein Fehler: Die Google-Verbindung ist
 * freiwillig, und ein Termin darf nie daran scheitern, dass es sie nicht gibt.
 * `getrennt` heißt: Der Zugang wurde bei Google entzogen — die Verbindung
 * wurde daraufhin entfernt und muss neu hergestellt werden.
 */
export type KalenderErgebnis =
  | { status: "ok"; eventId: string; meetLink: string | null }
  | { status: "nicht_verbunden" }
  | { status: "getrennt" }
  | { status: "fehler"; meldung: string };

/** Beim Entfernen gibt es keine Id zurück. */
export type KalenderAbsage =
  | { status: "ok" }
  | { status: "nicht_verbunden" }
  | { status: "getrennt" }
  | { status: "fehler"; meldung: string };

/**
 * Satz für die Oberfläche — oder null, wenn es nichts zu sagen gibt. Der
 * Termin ist zu diesem Zeitpunkt immer schon gespeichert; hier geht es nur
 * noch darum, ob er es auch in den Kalender geschafft hat.
 */
export function kalenderHinweis(
  ergebnis: KalenderErgebnis | KalenderAbsage,
): string | null {
  switch (ergebnis.status) {
    case "ok":
    case "nicht_verbunden":
      return null;
    case "getrennt":
      return (
        "Der Zugriff auf deinen Google-Kalender wurde entzogen. Bitte verbinde " +
        "ihn in den Einstellungen neu — der Termin selbst ist gespeichert."
      );
    case "fehler":
      return `Der Google-Kalender hat nicht mitgespielt: ${ergebnis.meldung} Der Termin selbst ist gespeichert.`;
  }
}
