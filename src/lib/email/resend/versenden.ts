/**
 * Der Versand-Teil der Resend-Anbindung: ein einziger HTTP-Aufruf.
 *
 * Bewusst ohne das Paket `resend`: Gebraucht wird ein einzelner Endpunkt,
 * dafür lohnt kein zusätzliches Paket — dasselbe Prinzip wie bei `googleapis`
 * in `src/lib/kalender/google/`. Der Ort bleibt derselbe — alles
 * Resend-Spezifische liegt hier unter `src/lib/email/resend/`.
 */

const VERSAND_URL = "https://api.resend.com/emails";

type ResendAntwort = {
  id?: string;
  message?: string;
  name?: string;
};

export async function resendMailSenden(felder: {
  apiKey: string;
  von: string;
  an: string;
  betreff: string;
  html: string;
  replyTo: string;
}): Promise<{ ok: true } | { ok: false; meldung: string }> {
  const antwort = await fetch(VERSAND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${felder.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: felder.von,
      to: [felder.an],
      subject: felder.betreff,
      html: felder.html,
      reply_to: felder.replyTo,
    }),
    cache: "no-store",
  });

  if (antwort.ok) return { ok: true };

  const fehler = (await antwort.json().catch(() => null)) as ResendAntwort | null;
  return {
    ok: false,
    meldung: fehler?.message ?? `Resend hat mit Status ${antwort.status} geantwortet.`,
  };
}
