"use client";

import { PencilIcon, RotateCcwIcon, SendIcon, SparklesIcon } from "lucide-react";
import { useActionState, useRef, useState } from "react";

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
import { Dialog } from "@/components/ui/dialog";
import { Feld } from "@/components/ui/feld";
import { Meldung } from "@/components/ui/meldung";
import { Textarea } from "@/components/ui/textarea";
import type { BestaetigungsStand } from "@/lib/termine/mail";

/** Rückmeldung zum Sofort-Versand aus dem Termin-Wizard (`?mail=` in der URL). */
export type SofortVersand = "gesendet" | "fehler";

const SOFORT_MELDUNG: Record<SofortVersand, FormularStatus> = {
  gesendet: { hinweis: "Termin angelegt und Bestätigung an den Kunden verschickt." },
  fehler: {
    fehler:
      "Termin angelegt, die Bestätigung ließ sich aber nicht verschicken. Bitte prüfen und erneut senden.",
  },
};

/**
 * Die Mail, wie der Kunde sie bekommt: Absender, Empfänger, Betreff, Text,
 * die automatischen Knöpfe und die Signatur. Der Text ist bearbeitbar, lässt
 * sich aus der Vorlage neu erstellen oder per KI um einen Hinweis ergänzen.
 * Nichts geht raus, bis „Jetzt senden" geklickt wird.
 */
export function TerminMail({
  terminId,
  entwurfHtml,
  kundeEmail,
  betreff,
  absender,
  antwortAn,
  signaturHtml,
  aktionenHtml,
  zusageLinkFehlt,
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
  /** Die Knöpfe für den Kunden (zusagen, Kalender) — stehen fest zwischen Text und Signatur. */
  aktionenHtml: string;
  /** true, wenn die App nur lokal erreichbar ist und der Zusage-Knopf deshalb fehlt. */
  zusageLinkFehlt: boolean;
  notizen: string | null;
  kiVerfuegbar: boolean;
  verschicktAm: string | null;
  stand: BestaetigungsStand;
  sofortVersand?: SofortVersand;
}) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [kiOffen, setKiOffen] = useState(false);
  // Kontrolliert, damit der Text nach einem KI-Fehler nicht verschwindet.
  const [hinweis, setHinweis] = useState("");
  // Welche Rückfrage gerade offen ist; nach „Ja" schickt sich das Formular ab.
  const [frage, setFrage] = useState<"vorlage" | "erneut" | null>(null);
  const bestaetigt = useRef(false);
  const vorlageFormular = useRef<HTMLFormElement>(null);
  const sendenFormular = useRef<HTMLFormElement>(null);

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

  function bestaetigen() {
    bestaetigt.current = true;
    const formular = frage === "vorlage" ? vorlageFormular.current : sendenFormular.current;
    setFrage(null);
    formular?.requestSubmit();
  }

  return (
    <div className="space-y-6">
      {sofortVersand && !eigeneMeldung && (
        <MeldeStatus status={SOFORT_MELDUNG[sofortVersand]} />
      )}
      <MeldeStatus status={sendenStatus} />
      <MeldeStatus status={entwurfStatus} />
      <MeldeStatus status={vorlageStatus} />
      <MeldeStatus status={kiStatus} />

      {stand === "geaendert" && (
        <Meldung art="hinweis" wort="Geändert">
          Nach dem letzten Versand geändert — der Kunde kennt diese Fassung noch nicht.
        </Meldung>
      )}
      {stand === "offen" && !sofortVersand && (
        <Meldung art="hinweis" wort="Offen">
          Noch nicht an den Kunden verschickt.
        </Meldung>
      )}
      {!kundeEmail && (
        <Meldung art="hinweis" wort="Keine Adresse">
          Für diesen Kunden ist keine E-Mail-Adresse hinterlegt.
        </Meldung>
      )}

      <div className="overflow-hidden rounded-karte border border-sand">
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 border-b border-sand bg-papier px-6 py-4 text-klein">
          <dt className="marke text-marine-mittel">Von</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">
            {absender}
            <span className="text-marine-mittel"> · Antworten an {antwortAn}</span>
          </dd>
          <dt className="marke text-marine-mittel">An</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{kundeEmail ?? "—"}</dd>
          <dt className="marke text-marine-mittel">Betreff</dt>
          <dd className="min-w-0 font-bold [overflow-wrap:anywhere]">{betreff}</dd>
        </dl>

        <div className="space-y-6 p-6">
          {bearbeiten ? (
            <form
              action={entwurfAction}
              onSubmit={() => setBearbeiten(false)}
              className="space-y-4"
            >
              <input type="hidden" name="id" value={terminId} />
              <RichTextEditor name="entwurf" defaultValue={entwurfHtml ?? ""} />
              <div className="flex flex-wrap gap-4">
                <Button type="submit" klein laeuft={entwurfLaeuft}>
                  {entwurfLaeuft ? "Wird gespeichert …" : "Entwurf speichern"}
                </Button>
                <Button
                  type="button"
                  variante="sekundaer"
                  klein
                  onClick={() => setBearbeiten(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          ) : (
            <div
              className="mailtext"
              // Sicher: entwurfHtml läuft bei jedem Speichern durch mailHtmlSaeubern
              // (src/lib/html-sicherheit.ts), bevor es in der Datenbank landet.
              dangerouslySetInnerHTML={{
                __html: entwurfHtml ?? "<p><em>Noch kein Entwurf.</em></p>",
              }}
            />
          )}

          <div className="rounded-feld bg-papier px-4 py-3">
            <p className="marke mb-3 text-marine-mittel">Automatisch in der Mail</p>
            <div
              className="pointer-events-none overflow-x-auto select-none"
              // Sicher: von uns erzeugt (kundenAktionenHtml), alle Werte escaped.
              dangerouslySetInnerHTML={{ __html: aktionenHtml }}
            />
            {zusageLinkFehlt && (
              <p className="mt-3 text-klein text-marine-mittel">
                Ohne öffentliche Adresse kein „Termin zusagen“.
              </p>
            )}
          </div>

          <SignaturVorschau signaturHtml={signaturHtml} zurueck={`/termine/${terminId}`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!bearbeiten && (
          <Button
            type="button"
            variante="sekundaer"
            klein
            onClick={() => setBearbeiten(true)}
            disabled={beschaeftigt}
          >
            <PencilIcon aria-hidden />
            Bearbeiten
          </Button>
        )}

        <form
          ref={vorlageFormular}
          action={vorlageAction}
          onSubmit={(event) => {
            if (entwurfHtml && !bestaetigt.current) {
              event.preventDefault();
              setFrage("vorlage");
            }
            bestaetigt.current = false;
          }}
        >
          <input type="hidden" name="id" value={terminId} />
          <Button
            type="submit"
            variante="sekundaer"
            klein
            laeuft={vorlageLaeuft}
            disabled={beschaeftigt || bearbeiten}
          >
            <RotateCcwIcon aria-hidden />
            {vorlageLaeuft ? "Wird erstellt …" : "Aus Vorlage"}
          </Button>
        </form>

        {kiVerfuegbar && entwurfHtml && !kiOffen && (
          <Button
            type="button"
            variante="sekundaer"
            klein
            onClick={() => setKiOffen(true)}
            disabled={beschaeftigt || bearbeiten}
          >
            <SparklesIcon aria-hidden />
            Hinweis mit KI
          </Button>
        )}

        <form
          ref={sendenFormular}
          action={sendenAction}
          className="ml-auto"
          onSubmit={(event) => {
            if (verschicktAm && !bestaetigt.current) {
              event.preventDefault();
              setFrage("erneut");
            }
            bestaetigt.current = false;
          }}
        >
          <input type="hidden" name="id" value={terminId} />
          {verschicktAm && <input type="hidden" name="erneut" value="on" />}
          <Button
            type="submit"
            laeuft={sendenLaeuft}
            disabled={beschaeftigt || bearbeiten || !kundeEmail || !entwurfHtml}
          >
            <SendIcon aria-hidden />
            {sendenLaeuft
              ? "Wird gesendet …"
              : verschicktAm
                ? "Erneut senden"
                : "Jetzt senden"}
          </Button>
        </form>
      </div>

      {kiOffen && (
        <form action={kiAction} className="space-y-4 rounded-feld border border-sand p-6">
          <input type="hidden" name="id" value={terminId} />
          <Feld label="Was soll zusätzlich in die Mail?" htmlFor="ki-hinweis">
            <Textarea
              id="ki-hinweis"
              name="hinweis"
              rows={3}
              maxLength={1000}
              value={hinweis}
              onChange={(event) => setHinweis(event.target.value)}
              placeholder="z. B. Bitte die letzten drei Gehaltsnachweise mitbringen."
            />
          </Feld>
          <p className="text-klein text-marine-mittel">
            Keine Finanz- oder Gesundheitsdaten: Der Text geht an einen externen KI-Dienst.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button type="submit" klein laeuft={kiLaeuft} disabled={beschaeftigt || !hinweis.trim()}>
              {kiLaeuft ? "Wird eingearbeitet …" : "Einarbeiten"}
            </Button>
            {notizen && (
              <Button type="button" variante="sekundaer" klein onClick={() => setHinweis(notizen)}>
                Terminnotiz übernehmen
              </Button>
            )}
            <Button type="button" variante="leise" klein onClick={() => setKiOffen(false)}>
              Schließen
            </Button>
          </div>
        </form>
      )}

      {verschicktAm && (
        <p className="text-klein text-marine-mittel">
          Zuletzt verschickt am {verschicktAm}
          {kundeEmail ? ` an ${kundeEmail}` : ""}.
        </p>
      )}

      <Dialog
        offen={frage === "vorlage"}
        titel="Aus der Vorlage neu erstellen?"
        bestaetigen="Neu erstellen"
        onBestaetigen={bestaetigen}
        onAbbrechen={() => setFrage(null)}
      >
        Eigene Änderungen und eingearbeitete Hinweise gehen dabei verloren.
      </Dialog>
      <Dialog
        offen={frage === "erneut"}
        titel="Erneut senden?"
        bestaetigen="Erneut senden"
        onBestaetigen={bestaetigen}
        onAbbrechen={() => setFrage(null)}
      >
        Diese Bestätigung wurde schon verschickt. Der Kunde bekommt sie ein zweites Mal.
      </Dialog>
    </div>
  );
}
