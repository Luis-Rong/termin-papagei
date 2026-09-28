"use client";

import { Sparkles } from "lucide-react";
import { useActionState, useState } from "react";

import {
  bestaetigungAusVorlage,
  bestaetigungEntwurfAktualisieren,
  bestaetigungHinweisEinarbeiten,
  bestaetigungSenden,
} from "@/app/(app)/termine/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { RichTextEditor } from "@/components/app/rich-text-editor";
import { SignaturVorschau } from "@/components/app/signatur-vorschau";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BestaetigungsStand } from "@/lib/termine/mail";

/** Rückmeldung zum Sofort-Versand aus dem Termin-Wizard (`?mail=` in der URL). */
export type SofortVersand = "gesendet" | "fehler";

const SOFORT_MELDUNG: Record<SofortVersand, FormularStatus> = {
  gesendet: { hinweis: "Termin angelegt und Bestätigung an den Kunden verschickt." },
  fehler: {
    fehler:
      "Termin angelegt, die Bestätigung konnte aber nicht direkt verschickt werden. Bitte unten prüfen und erneut senden.",
  },
};

/**
 * Die "Vorschau vor Versand" aus der Spezifikation: zeigt die Mail so, wie der
 * Kunde sie bekommt — Absender, Empfänger, Betreff, Text und die (hier nicht
 * änderbare) Signatur. Der Text ist bearbeitbar, lässt sich aus der Vorlage
 * neu erstellen oder per KI um einen persönlichen Hinweis ergänzen. Nichts
 * geht raus, bis aktiv "Senden" geklickt wird.
 */
export function TerminMail({
  terminId,
  entwurfHtml,
  kundeEmail,
  betreff,
  absender,
  antwortAn,
  signaturHtml,
  notizen,
  kiVerfuegbar,
  verschicktAm,
  stand,
  sofortVersand,
}: {
  terminId: string;
  entwurfHtml: string | null;
  kundeEmail: string | null;
  betreff: string;
  absender: string;
  antwortAn: string;
  signaturHtml: string | null;
  notizen: string | null;
  kiVerfuegbar: boolean;
  verschicktAm: string | null;
  stand: BestaetigungsStand;
  sofortVersand?: SofortVersand;
}) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [kiOffen, setKiOffen] = useState(false);
  // Kontrolliert, damit der Text nach einem KI-Fehler nicht verschwindet
  // (React leert nach einer Form-Action nur unkontrollierte Felder).
  const [hinweis, setHinweis] = useState("");

  const [sendenStatus, sendenAction, sendenLaeuft] = useActionState<
    FormularStatus,
    FormData
  >(bestaetigungSenden, {});
  const [entwurfStatus, entwurfAction, entwurfLaeuft] = useActionState<
    FormularStatus,
    FormData
  >(bestaetigungEntwurfAktualisieren, {});
  const [vorlageStatus, vorlageAction, vorlageLaeuft] = useActionState<
    FormularStatus,
    FormData
  >(bestaetigungAusVorlage, {});
  const [kiStatus, kiAction, kiLaeuft] = useActionState<FormularStatus, FormData>(
    bestaetigungHinweisEinarbeiten,
    {},
  );

  const eigeneMeldung = [sendenStatus, entwurfStatus, vorlageStatus, kiStatus].some(
    (status) => status.fehler || status.hinweis,
  );
  const beschaeftigt = sendenLaeuft || entwurfLaeuft || vorlageLaeuft || kiLaeuft;

  return (
    <div className="space-y-4">
      {sofortVersand && !eigeneMeldung && (
        <MeldeStatus status={SOFORT_MELDUNG[sofortVersand]} />
      )}
      <MeldeStatus status={sendenStatus} />
      <MeldeStatus status={entwurfStatus} />
      <MeldeStatus status={vorlageStatus} />
      <MeldeStatus status={kiStatus} />

      {stand === "geaendert" && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          Der Entwurf wurde nach dem letzten Versand geändert — diese Fassung
          hat der Kunde noch nicht. Bitte erneut senden.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b bg-muted/40 px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Von</dt>
          <dd>
            {absender}{" "}
            <span className="text-muted-foreground">
              · Antworten gehen an {antwortAn}
            </span>
          </dd>
          <dt className="text-muted-foreground">An</dt>
          <dd>{kundeEmail ?? "—"}</dd>
          <dt className="text-muted-foreground">Betreff</dt>
          <dd className="font-medium">{betreff}</dd>
        </dl>

        <div className="space-y-4 p-4">
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
              className="text-sm [&_img]:h-auto [&_img]:max-w-full [&_p]:my-2"
              // Sicher: entwurfHtml läuft bei jedem Speichern durch mailHtmlSaeubern
              // (src/lib/html-sicherheit.ts), bevor es in der Datenbank landet.
              dangerouslySetInnerHTML={{
                __html: entwurfHtml ?? "<p><em>Noch kein Entwurf vorhanden.</em></p>",
              }}
            />
          )}

          <SignaturVorschau signaturHtml={signaturHtml} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!bearbeiten && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBearbeiten(true)}
          >
            Text bearbeiten
          </Button>
        )}

        <form
          action={vorlageAction}
          onSubmit={(event) => {
            if (
              entwurfHtml &&
              !confirm(
                "Der Entwurf wird frisch aus der Vorlage erstellt. Eigene Änderungen und eingearbeitete Hinweise gehen dabei verloren. Fortfahren?",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={terminId} />
          <Button type="submit" variant="outline" size="sm" disabled={beschaeftigt}>
            {vorlageLaeuft ? "Wird erstellt …" : "Aus Vorlage neu erstellen"}
          </Button>
        </form>

        {kiVerfuegbar && entwurfHtml && !kiOffen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setKiOffen(true)}
          >
            <Sparkles aria-hidden />
            Hinweis mit KI einarbeiten
          </Button>
        )}

        <form
          action={sendenAction}
          className="ml-auto"
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
          <Button
            type="submit"
            size="sm"
            disabled={beschaeftigt || bearbeiten || !kundeEmail || !entwurfHtml}
          >
            {sendenLaeuft
              ? "Wird gesendet …"
              : verschicktAm
                ? "Erneut senden"
                : "Jetzt senden"}
          </Button>
        </form>
      </div>

      {kiOffen && (
        <form
          action={kiAction}
          className="space-y-3 rounded-lg border bg-secondary/30 p-4"
        >
          <input type="hidden" name="id" value={terminId} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="ki-hinweis">Was soll zusätzlich in die Mail?</Label>
            {notizen && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setHinweis(notizen)}
              >
                Terminnotiz übernehmen
              </Button>
            )}
          </div>
          <Textarea
            id="ki-hinweis"
            name="hinweis"
            rows={3}
            maxLength={1000}
            value={hinweis}
            onChange={(event) => setHinweis(event.target.value)}
            placeholder="z. B. Bitte die letzten drei Gehaltsnachweise und die aktuelle Renteninformation mitbringen."
          />
          <p className="text-xs text-muted-foreground">
            Die KI baut den Hinweis passend in den Text ein und lässt den Rest
            unverändert. Keine Finanz- oder Gesundheitsdaten eintragen — der
            Text geht an einen externen KI-Dienst.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={beschaeftigt || !hinweis.trim()}>
              {kiLaeuft ? "Wird eingearbeitet …" : "Einarbeiten"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setKiOffen(false)}
            >
              Schließen
            </Button>
          </div>
        </form>
      )}

      {verschicktAm && (
        <p className="text-xs text-muted-foreground">
          Zuletzt verschickt am {verschicktAm}
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
