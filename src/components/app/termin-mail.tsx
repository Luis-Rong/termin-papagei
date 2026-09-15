"use client";

import { useActionState, useState } from "react";

import {
  bestaetigungEntwurfAktualisieren,
  bestaetigungNeuPersonalisieren,
  bestaetigungSenden,
} from "@/app/(app)/termine/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { RichTextEditor } from "@/components/app/rich-text-editor";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";

/**
 * Die "Vorschau vor Versand" aus der Spezifikation: zeigt den beim Anlegen
 * erzeugten Mail-Entwurf, bearbeitbar über denselben Rich-Text-Editor wie
 * Vorlagen und Signatur. Nichts geht raus, bis aktiv "Senden" geklickt wird.
 */
export function TerminMail({
  terminId,
  entwurfHtml,
  kundeEmail,
  verschicktAm,
}: {
  terminId: string;
  entwurfHtml: string | null;
  kundeEmail: string | null;
  verschicktAm: string | null;
}) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [sendenStatus, sendenAction, sendenLaeuft] = useActionState<
    FormularStatus,
    FormData
  >(bestaetigungSenden, {});
  const [entwurfStatus, entwurfAction, entwurfLaeuft] = useActionState<
    FormularStatus,
    FormData
  >(bestaetigungEntwurfAktualisieren, {});
  const [neuStatus, neuAction, neuLaeuft] = useActionState<
    FormularStatus,
    FormData
  >(bestaetigungNeuPersonalisieren, {});

  return (
    <div className="space-y-4">
      <MeldeStatus status={sendenStatus} />
      <MeldeStatus status={entwurfStatus} />
      <MeldeStatus status={neuStatus} />

      {bearbeiten ? (
        <form
          action={entwurfAction}
          onSubmit={() => setBearbeiten(false)}
          className="space-y-3"
        >
          <input type="hidden" name="id" value={terminId} />
          <RichTextEditor name="entwurf" defaultValue={entwurfHtml ?? ""} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={entwurfLaeuft}>
              {entwurfLaeuft ? "Wird gespeichert …" : "Entwurf speichern"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBearbeiten(false)}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      ) : (
        <div
          className="rounded-md border bg-muted/30 p-4 text-sm [&_img]:max-w-full [&_p]:my-2"
          // Sicher: entwurfHtml läuft bei jedem Speichern durch mailHtmlSaeubern
          // (src/lib/html-sicherheit.ts), bevor es in der Datenbank landet.
          dangerouslySetInnerHTML={{
            __html: entwurfHtml ?? "<p><em>Noch kein Entwurf vorhanden.</em></p>",
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!bearbeiten && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBearbeiten(true)}
          >
            Bearbeiten
          </Button>
        )}

        <form action={neuAction}>
          <input type="hidden" name="id" value={terminId} />
          <Button type="submit" variant="outline" size="sm" disabled={neuLaeuft}>
            {neuLaeuft ? "Wird personalisiert …" : "Neu personalisieren"}
          </Button>
        </form>

        <form
          action={sendenAction}
          onSubmit={(event) => {
            if (
              verschicktAm &&
              !confirm(
                "Diese Bestätigung wurde schon verschickt. Trotzdem erneut senden?",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={terminId} />
          {verschicktAm && <input type="hidden" name="erneut" value="on" />}
          <Button type="submit" size="sm" disabled={sendenLaeuft || !kundeEmail}>
            {sendenLaeuft
              ? "Wird gesendet …"
              : verschicktAm
                ? "Erneut senden"
                : "Jetzt senden"}
          </Button>
        </form>
      </div>

      {verschicktAm && (
        <p className="text-xs text-muted-foreground">
          Verschickt am {verschicktAm}
          {kundeEmail ? ` an ${kundeEmail}` : ""}.
        </p>
      )}
      {!kundeEmail && (
        <p className="text-xs text-destructive">
          Für diesen Kunden ist keine E-Mail-Adresse hinterlegt — Versand nicht
          möglich.
        </p>
      )}
    </div>
  );
}
