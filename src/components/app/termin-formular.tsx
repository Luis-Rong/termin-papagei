"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  terminAnlegen,
  terminSpeichern,
} from "@/app/(app)/termine/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { ZeitpunktFelder } from "@/components/app/zeitpunkt-felder";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OHNE_PARTNER } from "@/lib/partner/typen";
import {
  DAUER_VORSCHLAEGE,
  dauerLabel,
  ERINNERUNG_1TAG_STUNDEN_VORGABE,
  ERINNERUNG_2STD_STUNDEN_VORGABE,
  ERINNERUNG_STUNDEN_MAX,
  istTerminart,
  ORTE,
  TERMINART_REIHENFOLGE,
  TERMINARTEN,
} from "@/lib/termine/terminarten";
import { teileZeitpunkt } from "@/lib/zeit";

export type TerminKunde = {
  id: string;
  name: string;
  /** Vertriebspartner des Kunden — wird als Vorschlag übernommen. */
  partnerId: string | null;
};

export type TerminPartner = { id: string; name: string };

export type TerminFormularWerte = {
  id: string;
  kundeId: string;
  terminart: string;
  ort: string;
  /** Format des Eingabefelds: "2026-08-12T14:30". */
  beginn: string;
  dauer: number;
  partnerId: string;
  notizen: string;
  erinnerung1TagAktiv: boolean;
  erinnerung1TagStunden: number;
  erinnerung2StdAktiv: boolean;
  erinnerung2StdStunden: number;
};

/** Zeigt an, was die gewählte Terminart später auslöst. */
function RegelHinweis({ terminart }: { terminart: string }) {
  if (!istTerminart(terminart)) return null;
  const regeln = TERMINARTEN[terminart];

  const punkte = [
    regeln.bestaetigungAnKunden && "Bestätigung an den Kunden",
    regeln.anrufErinnerungAnVermittler &&
      "Erinnerung an dich, den Kunden am Vortag anzurufen",
    regeln.vorbereitungstermin && "eigener Vorbereitungstermin",
  ].filter(Boolean);

  return (
    <div className="flex gap-2 rounded-md bg-secondary/50 px-3 py-2 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p>
        <span className="font-semibold">Für {regeln.label} vorgesehen:</span>{" "}
        {punkte.join(", ")}. Der automatische Versand kommt in einer der
        nächsten Phasen.
      </p>
    </div>
  );
}

/** Ein Kontrollkästchen mit Vorlauf-Feld — für je eine der beiden Erinnerungen. */
function ErinnerungBlock({
  titel,
  beschreibung,
  aktivName,
  stundenName,
  aktivVorgabe,
  stundenVorgabe,
}: {
  titel: string;
  beschreibung: string;
  aktivName: string;
  stundenName: string;
  aktivVorgabe: boolean;
  stundenVorgabe: number;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox
        id={aktivName}
        name={aktivName}
        defaultChecked={aktivVorgabe}
        className="mt-0.5"
      />
      <div className="flex-1 space-y-2">
        <div>
          <Label htmlFor={aktivName} className="font-normal">
            {titel}
          </Label>
          <p className="text-xs text-muted-foreground">{beschreibung}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id={stundenName}
            name={stundenName}
            type="number"
            min={1}
            max={ERINNERUNG_STUNDEN_MAX}
            defaultValue={stundenVorgabe}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">Stunden vorher</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Formular zum Anlegen und Bearbeiten eines Kundentermins.
 * Ohne `termin` wird ein neuer angelegt, mit `termin` bearbeitet.
 */
export function TerminFormular({
  kunden,
  partner,
  termin,
  beginnVorschlag,
}: {
  kunden: TerminKunde[];
  partner: TerminPartner[];
  termin?: TerminFormularWerte;
  /** Vorbelegung für einen neuen Termin. */
  beginnVorschlag: string;
}) {
  const bearbeiten = termin !== undefined;
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    bearbeiten ? terminSpeichern : terminAnlegen,
    {},
  );

  // Nach einer Aktion leert React das Formular; `status.werte` füllt es wieder.
  const zuletzt = status.werte;

  const vorgabe = teileZeitpunkt(termin?.beginn ?? beginnVorschlag);
  const beginn = {
    datum: zuletzt?.datum ?? vorgabe.datum,
    uhrzeit: zuletzt?.uhrzeit ?? vorgabe.uhrzeit,
  };

  const [kundeId, setKundeId] = useState(
    zuletzt?.kunde ?? termin?.kundeId ?? "",
  );
  const [terminart, setTerminart] = useState(
    zuletzt?.terminart ?? termin?.terminart ?? "erstgespraech",
  );
  const [dauer, setDauer] = useState(
    String(zuletzt?.dauer ?? termin?.dauer ?? TERMINARTEN.erstgespraech.dauerMinuten),
  );
  const [partnerId, setPartnerId] = useState(
    zuletzt?.partner ?? termin?.partnerId ?? OHNE_PARTNER,
  );

  // Beide Erinnerungen sind uncontrolled (defaultChecked/defaultValue) wie die
  // übrigen Felder hier — nach einem Fehler kommt der zuletzt abgeschickte
  // Stand zurück, sonst der gespeicherte Termin, sonst Standard an.
  const erinnerung1TagAktiv = zuletzt
    ? zuletzt.erinnerung1TagAktiv === "on"
    : (termin?.erinnerung1TagAktiv ?? true);
  const erinnerung1TagStunden =
    Number(zuletzt?.erinnerung1TagStunden) ||
    termin?.erinnerung1TagStunden ||
    ERINNERUNG_1TAG_STUNDEN_VORGABE;
  const erinnerung2StdAktiv = zuletzt
    ? zuletzt.erinnerung2StdAktiv === "on"
    : (termin?.erinnerung2StdAktiv ?? true);
  const erinnerung2StdStunden =
    Number(zuletzt?.erinnerung2StdStunden) ||
    termin?.erinnerung2StdStunden ||
    ERINNERUNG_2STD_STUNDEN_VORGABE;

  // Terminart wechseln setzt die übliche Dauer — von Hand geändert werden darf
  // sie danach trotzdem.
  function terminartWechseln(wert: string) {
    setTerminart(wert);
    if (istTerminart(wert)) setDauer(String(TERMINARTEN[wert].dauerMinuten));
  }

  // Kommt der Kunde über einen Vertriebspartner, ist der beim Termin fast immer
  // auch der Beteiligte — deshalb als Vorschlag übernehmen.
  function kundeWechseln(wert: string) {
    setKundeId(wert);
    const gewaehlt = kunden.find((kunde) => kunde.id === wert);
    setPartnerId(gewaehlt?.partnerId ?? OHNE_PARTNER);
  }

  const zeigeVorbereitung =
    !bearbeiten && istTerminart(terminart) && TERMINARTEN[terminart].vorbereitungstermin;

  if (kunden.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Für einen Termin wird ein Kunde gebraucht. Lege zuerst einen an —
          danach kannst du hier Termine dafür planen.
        </p>
        <Button asChild>
          <Link href="/kunden/neu">Ersten Kunden anlegen</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <MeldeStatus status={status} />

      {bearbeiten && <input type="hidden" name="id" value={termin.id} />}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="kunde">Kunde</Label>
          <Select
            name="kunde"
            value={kundeId}
            onValueChange={kundeWechseln}
            required
          >
            <SelectTrigger id="kunde" className="w-full">
              <SelectValue placeholder="Kunden auswählen" />
            </SelectTrigger>
            <SelectContent>
              {kunden.map((kunde) => (
                <SelectItem key={kunde.id} value={kunde.id}>
                  {kunde.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="terminart">Terminart</Label>
            <Select
              name="terminart"
              value={terminart}
              onValueChange={terminartWechseln}
            >
              <SelectTrigger id="terminart" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMINART_REIHENFOLGE.map((art) => (
                  <SelectItem key={art} value={art}>
                    {TERMINARTEN[art].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ort">Ort</Label>
            <Select name="ort" defaultValue={zuletzt?.ort ?? termin?.ort ?? "buero"}>
              <SelectTrigger id="ort" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORTE).map(([wert, label]) => (
                  <SelectItem key={wert} value={wert}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <RegelHinweis terminart={terminart} />
      </div>

      <div className="space-y-2">
        <Label>Erinnerungen an den Kunden</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <ErinnerungBlock
            titel="1 Tag vorher"
            beschreibung="Kurze Erinnerung mit etwas Vorlauf."
            aktivName="erinnerung1TagAktiv"
            stundenName="erinnerung1TagStunden"
            aktivVorgabe={erinnerung1TagAktiv}
            stundenVorgabe={erinnerung1TagStunden}
          />
          <ErinnerungBlock
            titel="2 Std vorher"
            beschreibung="Kurz vor dem Termin, damit er nicht vergessen wird."
            aktivName="erinnerung2StdAktiv"
            stundenName="erinnerung2StdStunden"
            aktivVorgabe={erinnerung2StdAktiv}
            stundenVorgabe={erinnerung2StdStunden}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Beide sind standardmäßig an, lassen sich hier aber je Termin einzeln
          abschalten oder im Vorlauf anpassen.
        </p>
      </div>

      <div className="space-y-2">
        <div className="grid gap-4 sm:grid-cols-3">
          <ZeitpunktFelder
            id="termin"
            datumName="datum"
            uhrzeitName="uhrzeit"
            datum={beginn.datum}
            uhrzeit={beginn.uhrzeit}
          />

          <div className="space-y-2">
            <Label htmlFor="dauer">Dauer</Label>
            <Select name="dauer" value={dauer} onValueChange={setDauer}>
              <SelectTrigger id="dauer" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAUER_VORSCHLAEGE.map((minuten) => (
                  <SelectItem key={minuten} value={String(minuten)}>
                    {dauerLabel(minuten)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Immer deutsche Zeit (Europe/Berlin), in Viertelstunden-Schritten.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partner">Beteiligter Vertriebspartner</Label>
        <Select name="partner" value={partnerId} onValueChange={setPartnerId}>
          <SelectTrigger id="partner" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OHNE_PARTNER}>Kein Partner beteiligt</SelectItem>
            {partner.map((eintrag) => (
              <SelectItem key={eintrag.id} value={eintrag.id}>
                {eintrag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Der Partner sieht den Termin in seiner Liste und bekommt ihn später in
          seinen Kalender. Ändern und löschen kannst nur du.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notizen">Notizen</Label>
        <Textarea
          id="notizen"
          name="notizen"
          rows={3}
          defaultValue={zuletzt?.notizen ?? termin?.notizen ?? ""}
          placeholder="Worum geht es? Was ist mitzubringen?"
        />
      </div>

      {zeigeVorbereitung && (
        <div className="space-y-4 rounded-lg border border-dashed p-4">
          <div>
            <p className="font-heading text-lg font-semibold text-primary">
              Vorbereitungstermin
            </p>
            <p className="text-sm text-muted-foreground">
              Nur für deinen eigenen Kalender, ohne den Kunden. Kannst du leer
              lassen und später vom Termin aus nachtragen.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ZeitpunktFelder
              id="vorbereitung"
              datumName="vorbereitungDatum"
              uhrzeitName="vorbereitungUhrzeit"
              datum={zuletzt?.vorbereitungDatum ?? ""}
              uhrzeit={zuletzt?.vorbereitungUhrzeit ?? ""}
              pflicht={false}
            />

            <div className="space-y-2">
              <Label htmlFor="vorbereitungDauer">Dauer</Label>
              <Select
                name="vorbereitungDauer"
                defaultValue={zuletzt?.vorbereitungDauer ?? "60"}
              >
                <SelectTrigger id="vorbereitungDauer" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAUER_VORSCHLAEGE.map((minuten) => (
                    <SelectItem key={minuten} value={String(minuten)}>
                      {dauerLabel(minuten)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={laeuft}>
          {laeuft
            ? "Wird gespeichert …"
            : bearbeiten
              ? "Änderungen speichern"
              : "Termin anlegen"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={bearbeiten ? `/termine/${termin.id}` : "/termine"}>
            Abbrechen
          </Link>
        </Button>
      </div>
    </form>
  );
}
