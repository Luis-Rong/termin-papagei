/**
 * Die Mail, wie die Anwendung sie sieht: nur noch `mailVersenden`. Dass
 * dahinter Resend steckt, steht ausschließlich in `resend/` — außerhalb von
 * `src/lib/email/` taucht kein Resend-Aufruf und kein API-Key auf.
 *
 * Grundregel für alle Funktionen hier: Sie werfen nie. Ein Termin ist immer
 * schon gespeichert, wenn die Mail an der Reihe ist, und darf nie daran
 * scheitern, dass Resend gerade nicht mag oder gar nicht eingerichtet ist.
 */

import { resendMailSenden } from "./resend/versenden";
import type { EmailErgebnis, EmailNachricht } from "./typen";

export type { EmailErgebnis, EmailNachricht } from "./typen";

/** Ohne API-Key und Absenderadresse bleibt der Mailversand aus. */
export function emailEingerichtet(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_ABSENDER_ADRESSE?.trim(),
  );
}

export async function mailVersenden(nachricht: EmailNachricht): Promise<EmailErgebnis> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const absenderAdresse = process.env.EMAIL_ABSENDER_ADRESSE?.trim();

  if (!apiKey || !absenderAdresse) return { status: "nicht_eingerichtet" };

  try {
    // "Anzeigename <adresse>" — der Kunde sieht den Namen seines Beraters,
    // technischer Absender bleibt die gemeinsame, verifizierte Domain.
    const von = `${nachricht.absenderName} <${absenderAdresse}>`;

    const ergebnis = await resendMailSenden({
      apiKey,
      von,
      an: nachricht.an,
      betreff: nachricht.betreff,
      html: nachricht.html,
      replyTo: nachricht.replyTo,
    });

    return ergebnis.ok ? { status: "ok" } : { status: "fehler", meldung: ergebnis.meldung };
  } catch (fehler) {
    return {
      status: "fehler",
      meldung: fehler instanceof Error ? fehler.message : "Unbekannter Fehler.",
    };
  }
}
