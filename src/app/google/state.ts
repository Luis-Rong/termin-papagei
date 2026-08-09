/**
 * Der Zufallswert, der Hin- und Rückweg der Google-Anmeldung verklammert: Er
 * geht einmal mit zu Google und liegt gleichzeitig als Cookie im Browser. Nur
 * wenn beim Rückweg beides zusammenpasst, stammt die Antwort auch wirklich von
 * der Anfrage, die dieser Browser gestellt hat.
 *
 * Steht bewusst neben den Routen und nicht in ihnen: Eine `route.ts` darf nur
 * die HTTP-Methoden nach außen geben.
 */
export const STATE_COOKIE = "kalender_state";

/** Beide Routen liegen unter /google — weiter muss das Cookie nicht reichen. */
export const STATE_PFAD = "/google";

/** Zehn Minuten reichen für eine Zustimmung bei Google reichlich. */
export const STATE_GUELTIG_SEKUNDEN = 10 * 60;
