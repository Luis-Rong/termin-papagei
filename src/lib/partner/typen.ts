/**
 * Typen und Konstanten rund um das Partner-Netzwerk.
 *
 * Diese Datei darf bewusst nichts vom Server importieren: Sie wird auch von
 * Client-Komponenten (Kundenformular) verwendet. Alles, was die Datenbank
 * anfasst, steht in `abfragen.ts`.
 */

/**
 * Wert im Kundenformular für „kein Vertriebspartner". Ein leerer String geht
 * nicht: Die Auswahlliste von Radix verwendet ihn intern zum Zurücksetzen.
 */
export const EIGENER_KUNDE = "eigener";

/** Eine Zeile aus `profiles`, so wie sie die Datenbank liefert. */
export type ProfilZeile = {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string;
};

/** Ein anderer Vermittler, so wie ihn die Oberfläche anzeigt. */
export type PartnerProfil = {
  id: string;
  vorname: string;
  nachname: string;
  firma: string | null;
  email: string;
};

export type Partnerschaft = {
  /** Id des Eintrags in `partnerships` — nötig für Annehmen, Ablehnen, Beenden. */
  id: string;
  partner: PartnerProfil;
};

export type PartnerDaten = {
  /** Bestätigte Partner („Freundesliste"). */
  partner: Partnerschaft[];
  /** Anfragen, die andere an mich gestellt haben. */
  eingehend: Partnerschaft[];
  /** Anfragen, die ich gestellt habe und die noch offen sind. */
  ausgehend: Partnerschaft[];
  fehler?: string;
};
