import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * Die Signatur unter Vorlage und Mail-Entwurf — sichtbar, damit niemand im
 * Text selbst noch einmal grüßt, aber hier nicht änderbar: Sie gehört ins
 * Profil und hängt beim Versand automatisch unter jede Mail.
 */
export function SignaturVorschau({ signaturHtml }: { signaturHtml: string | null }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3" aria-hidden />
          Deine Signatur — wird automatisch angehängt
        </span>
        <Link
          href="/einstellungen#signatur"
          className="font-medium text-primary underline underline-offset-4"
        >
          Signatur ändern
        </Link>
      </div>

      {signaturHtml ? (
        <div
          className="pointer-events-none select-none text-muted-foreground [&_img]:h-auto [&_img]:max-w-full [&_p]:my-1"
          // Sicher: die Signatur läuft beim Speichern durch mailHtmlSaeubern
          // (src/lib/html-sicherheit.ts).
          dangerouslySetInnerHTML={{ __html: signaturHtml }}
        />
      ) : (
        <p className="text-muted-foreground">
          Noch keine Signatur hinterlegt — die Mail endet dann direkt nach deinem
          Text.
        </p>
      )}
    </div>
  );
}
