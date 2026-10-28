import { LockIcon } from "lucide-react";
import Link from "next/link";

/**
 * Die Signatur unter Vorlage und Mail-Entwurf — sichtbar, damit niemand im
 * Text noch einmal grüßt, hier aber nicht änderbar: Sie gehört ins Profil und
 * hängt beim Versand automatisch unter jede Mail.
 */
export function SignaturVorschau({
  signaturHtml,
  zurueck,
}: {
  signaturHtml: string | null;
  /** Wohin „Zurück" auf der Einstellungsseite führt — die Seite, von der man kam. */
  zurueck?: string;
}) {
  const ziel = zurueck
    ? `/einstellungen?zurueck=${encodeURIComponent(zurueck)}#signatur`
    : "/einstellungen#signatur";
  return (
    <div className="rounded-feld bg-papier px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="marke inline-flex items-center gap-2 text-marine-mittel">
          <LockIcon className="size-3.5" aria-hidden />
          Signatur
        </span>
        <Link href={ziel} className="text-klein">
          Ändern
        </Link>
      </div>

      {signaturHtml ? (
        <div
          className="mailtext pointer-events-none text-klein text-marine-mittel select-none"
          // Sicher: die Signatur läuft beim Speichern durch mailHtmlSaeubern
          // (src/lib/html-sicherheit.ts).
          dangerouslySetInnerHTML={{ __html: signaturHtml }}
        />
      ) : (
        <p className="text-klein text-marine-mittel">Keine Signatur hinterlegt.</p>
      )}
    </div>
  );
}
