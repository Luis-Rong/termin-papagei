"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import {
  vorlageAnlegen,
  vorlageSpeichern,
  type VorlagenStatus,
} from "@/app/(app)/vorlagen/actions";
import { RichTextEditor } from "@/components/app/rich-text-editor";
import { SignaturVorschau } from "@/components/app/signatur-vorschau";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatzhalterMenue } from "@/components/ui/platzhalter-menue";
import { Umschalter } from "@/components/ui/umschalter";
import { Stufen } from "@/components/ui/stufen";
import {
  VORLAGEN_BEREICH_REIHENFOLGE,
  VORLAGEN_BEREICHE,
  ZWECK_REIHENFOLGE,
  ZWECKE,
} from "@/lib/vorlagen/typen";

export type VorlagenFormularWerte = {
  id: string;
  bereich: string;
  zweck: string;
  anrede: string;
  betreff: string;
  text: string;
};

/** Betreff mit Platzhalter-Menü: Der Platzhalter landet an der Schreibmarke. */
function BetreffFeld({
  defaultValue,
  onChange,
}: {
  defaultValue: string;
  onChange: () => void;
}) {
  const [betreff, setBetreff] = useState(defaultValue);
  const ref = useRef<HTMLInputElement>(null);

  function einfuegen(wert: string) {
    const feld = ref.current;
    const von = feld?.selectionStart ?? betreff.length;
    const bis = feld?.selectionEnd ?? betreff.length;
    const neu = betreff.slice(0, von) + wert + betreff.slice(bis);
    setBetreff(neu);
    onChange();
    requestAnimationFrame(() => {
      feld?.focus();
      feld?.setSelectionRange(von + wert.length, von + wert.length);
    });
  }

  return (
    <div className="feld">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="betreff" className="feld-beschriftung mb-0">
          Betreff
        </label>
        <PlatzhalterMenue onWaehlen={(eintrag) => einfuegen(eintrag.wert)} />
      </div>
      <Input
        ref={ref}
        id="betreff"
        name="betreff"
        value={betreff}
        onChange={(event) => {
          setBetreff(event.target.value);
          onChange();
        }}
        autoComplete="off"
        required
      />
    </div>
  );
}

/**
 * Formular zum Anlegen und Bearbeiten einer eigenen Vorlage.
 * Ohne `vorlage` wird eine neue angelegt, mit `vorlage` bearbeitet.
 */
export function VorlagenFormular({
  vorlage,
  signaturHtml,
  bereichVorschlag,
}: {
  vorlage?: VorlagenFormularWerte;
  /** Nur zur Ansicht unter dem Text — geändert wird sie in den Einstellungen. */
  signaturHtml: string | null;
  /** Vorbelegung für eine neue Vorlage, z. B. „sonstige" aus dem Bereich heraus. */
  bereichVorschlag?: string;
}) {
  const bearbeiten = vorlage !== undefined;
  const [status, action, laeuft] = useActionState<VorlagenStatus, FormData>(
    bearbeiten ? vorlageSpeichern : vorlageAnlegen,
    {},
  );
  const [geaendert, setGeaendert] = useState(false);

  const werte = status.werte ?? {
    bereich: vorlage?.bereich ?? bereichVorschlag ?? "erstgespraech",
    zweck: vorlage?.zweck ?? "bestaetigung",
    anrede: vorlage?.anrede ?? "du",
    betreff: vorlage?.betreff ?? "",
    text: vorlage?.text ?? "",
  };

  const [bereich, setBereich] = useState(werte.bereich);
  const [sie, setSie] = useState(werte.anrede === "sie");
  const merken = () => setGeaendert(true);

  return (
    <form action={action} className="space-y-8" onChange={merken}>
      <MeldeStatus status={status} />

      {bearbeiten && <input type="hidden" name="id" value={vorlage.id} />}

      <div className="feld">
        <span className="feld-beschriftung">Bereich</span>
        <Stufen
          name="bereich"
          aria-label="Bereich"
          wert={bereich}
          onChange={(wert) => {
            setBereich(wert);
            merken();
          }}
          optionen={VORLAGEN_BEREICH_REIHENFOLGE.map((wert) => ({
            wert,
            label: VORLAGEN_BEREICHE[wert],
            trennerDavor: wert === "after_sales" || wert === "telefon" || wert === "sonstige",
          }))}
        />
      </div>

      <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
        {bereich !== "sonstige" && (
          <div className="feld">
            <span className="feld-beschriftung">Zweck</span>
            <Stufen
              name="zweck"
              aria-label="Zweck"
              defaultWert={werte.zweck === "sonstige" ? "bestaetigung" : werte.zweck}
              optionen={ZWECK_REIHENFOLGE.map((zweck) => ({ wert: zweck, label: ZWECKE[zweck] }))}
            />
          </div>
        )}
        <div className="feld">
          <span className="feld-beschriftung">Anrede</span>
          <Umschalter
            name="anrede"
            aria-label="Anrede"
            optionen={[
              { wert: "du", label: "per Du" },
              { wert: "sie", label: "per Sie" },
            ]}
            wert={sie ? "sie" : "du"}
            onChange={(wert) => {
              setSie(wert === "sie");
              merken();
            }}
          />
        </div>
      </div>

      <BetreffFeld defaultValue={werte.betreff} onChange={merken} />

      <div className="feld">
        <span className="feld-beschriftung">Text</span>
        <RichTextEditor name="text" defaultValue={werte.text} mitPlatzhaltern onChange={merken} />
        <div className="mt-4">
          <SignaturVorschau signaturHtml={signaturHtml} zurueck="/vorlagen" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button type="submit" laeuft={laeuft} disabled={bearbeiten && !geaendert}>
          {laeuft
            ? "Wird gespeichert …"
            : bearbeiten
              ? "Änderungen speichern"
              : "Vorlage anlegen"}
        </Button>
        {!bearbeiten && (
          <Button asChild variante="sekundaer">
            <Link href="/vorlagen">Abbrechen</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
