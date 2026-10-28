"use client";

import { BuildingIcon, MapPinIcon, PhoneIcon, PlusIcon, VideoIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  terminAnlegen,
  terminSpeichern,
} from "@/app/(app)/termine/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { ErinnerungFeld } from "@/components/app/erinnerung-feld";
import { KundenFelder } from "@/components/app/kunden-felder";
import { KundenSuche } from "@/components/app/kunden-suche";
import { NutzenAuswahl } from "@/components/app/nutzen-auswahl";
import { ZeitpunktFelder } from "@/components/app/zeitpunkt-felder";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Aufklappen } from "@/components/ui/aufklappen";
import { Button } from "@/components/ui/button";
import { KaestchenZeile } from "@/components/ui/checkbox";
import { Feld } from "@/components/ui/feld";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stufen } from "@/components/ui/stufen";
import { Textarea } from "@/components/ui/textarea";
import { OHNE_PARTNER } from "@/lib/partner/typen";
import {
  DAUER_VORSCHLAEGE,
  dauerLabel,
  ERINNERUNGEN_MAX,
  erinnerungsVorgaben,
  istOrt,
  istTerminart,
  ORT_REIHENFOLGE,
  ORTE,
  TERMINART_GRUPPEN,
  TERMINARTEN,
  type ErinnerungsEinstellung,
  type Ort,
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
  ortStrasse: string;
  ortPlzOrt: string;
  nutzen: string[];
  /** Format des Eingabefelds: "2026-08-12T14:30". */
  beginn: string;
  dauer: number;
  partnerId: string;
  notizen: string;
  /** Index 0 = 1. Erinnerung; zwei bis fünf Stück. */
  erinnerungen: ErinnerungsEinstellung[];
};

const ORT_SYMBOLE: Record<Ort, React.ReactNode> = {
  buero: <BuildingIcon aria-hidden />,
  digital: <VideoIcon aria-hidden />,
  telefon: <PhoneIcon aria-hidden />,
  anderer: <MapPinIcon aria-hidden />,
};

/** Dauer als Stufen — eine Dauer außerhalb der Vorschläge (älterer Termin) bleibt wählbar. */
export function DauerStufen({
  name,
  wert,
  onChange,
}: {
  name: string;
  wert: string;
  onChange: (wert: string) => void;
}) {
  const aktuell = Number(wert);
  const dauern: number[] = (DAUER_VORSCHLAEGE as readonly number[]).includes(aktuell)
    ? [...DAUER_VORSCHLAEGE]
    : [...DAUER_VORSCHLAEGE, aktuell].filter(Boolean).sort((a, b) => a - b);

  return (
    <Stufen
      name={name}
      aria-label="Dauer"
      klein
      wert={wert}
      onChange={onChange}
      optionen={dauern.map((minuten) => ({ wert: String(minuten), label: dauerLabel(minuten) }))}
    />
  );
}

/** Die Erinnerungen aus den zurückgeschickten Formularwerten, sonst die übergebenen. */
function erinnerungenAusWerten(
  werte: Record<string, string> | undefined,
  sonst: ErinnerungsEinstellung[],
): ErinnerungsEinstellung[] {
  if (!werte) return sonst;
  const liste: ErinnerungsEinstellung[] = [];
  for (let nummer = 1; nummer <= ERINNERUNGEN_MAX; nummer += 1) {
    const feld = (name: string) => werte[`erinnerung${nummer}${name}`];
    if (!feld("Modus")) continue;
    liste.push({
      aktiv: feld("Aktiv") === "on",
      modus: feld("Modus") === "uhrzeit" ? "uhrzeit" : "vorlauf",
      stunden: Number(feld("Stunden")) || 24,
      tage: Number(feld("Tage")) || 0,
      uhrzeit: feld("Uhrzeit") || "09:00",
    });
  }
  return liste.length >= 2 ? liste : sonst;
}

/** Vorschlag für eine zusätzliche Erinnerung: ein Tag vor der bisher frühesten. */
function naechsteErinnerung(bisher: ErinnerungsEinstellung[]): ErinnerungsEinstellung {
  const laengster = Math.max(...bisher.map((e) => (e.modus === "vorlauf" ? e.stunden : e.tage * 24)));
  return { aktiv: true, modus: "vorlauf", stunden: Math.min(336, laengster + 24), tage: 0, uhrzeit: "09:00" };
}

/**
 * Formular zum Anlegen und Bearbeiten eines Kundentermins.
 * Ohne `termin` wird ein neuer angelegt, mit `termin` bearbeitet — dann ist
 * „Änderungen speichern" erst aktiv, wenn sich etwas geändert hat.
 */
export function TerminFormular({
  kunden,
  partner,
  eigeneNutzen,
  termin,
  beginnVorschlag,
  kundeVorschlag,
}: {
  kunden: TerminKunde[];
  partner: TerminPartner[];
  /** Eigene Nutzen aus dem Profil. */
  eigeneNutzen: string[];
  termin?: TerminFormularWerte;
  /** Vorbelegung für einen neuen Termin. */
  beginnVorschlag: string;
  /** Vorausgewählter Kunde, z. B. vom „Termin anlegen"-Knopf auf der Kundenseite. */
  kundeVorschlag?: string;
}) {
  const bearbeiten = termin !== undefined;
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    bearbeiten ? terminSpeichern : terminAnlegen,
    {},
  );
  const [geaendert, setGeaendert] = useState(false);

  // Nach einer Aktion leert React das Formular; `status.werte` füllt es wieder.
  const zuletzt = status.werte;

  const vorgabe = teileZeitpunkt(termin?.beginn ?? beginnVorschlag);
  const beginn = {
    datum: zuletzt?.datum ?? vorgabe.datum,
    uhrzeit: zuletzt?.uhrzeit ?? vorgabe.uhrzeit,
  };

  // Ohne einen einzigen Kunden geht es direkt mit „Neuer Kunde" los.
  const [kundeModus, setKundeModus] = useState<"bestehend" | "neu">(
    zuletzt?.kundeModus === "neu" || (!bearbeiten && kunden.length === 0) ? "neu" : "bestehend",
  );
  const [kundeId, setKundeId] = useState(
    zuletzt?.kunde ?? termin?.kundeId ?? kundeVorschlag ?? "",
  );
  const [terminart, setTerminart] = useState(
    zuletzt?.terminart ?? termin?.terminart ?? "erstgespraech",
  );
  const startOrt = zuletzt?.ort ?? termin?.ort ?? "buero";
  const [ort, setOrt] = useState<Ort>(istOrt(startOrt) ? startOrt : "buero");
  const [dauer, setDauer] = useState(
    String(zuletzt?.dauer ?? termin?.dauer ?? TERMINARTEN.erstgespraech.dauerMinuten),
  );
  const [partnerId, setPartnerId] = useState(
    zuletzt?.partner ??
      termin?.partnerId ??
      kunden.find((kunde) => kunde.id === kundeVorschlag)?.partnerId ??
      OHNE_PARTNER,
  );

  const [erinnerungen, setErinnerungen] = useState<ErinnerungsEinstellung[]>(
    erinnerungenAusWerten(zuletzt, termin?.erinnerungen ?? erinnerungsVorgaben(ort)),
  );
  // Solange niemand an den Erinnerungen gedreht hat, folgen sie dem Ort
  // (Telefontermin: am Termintag um 9 und 1 Std vorher).
  const [erinnerungenAngefasst, setErinnerungenAngefasst] = useState(bearbeiten);

  function merken() {
    setGeaendert(true);
  }

  // Terminart wechseln setzt die übliche Dauer — von Hand änderbar bleibt sie.
  function terminartWechseln(wert: string) {
    setTerminart(wert);
    if (istTerminart(wert)) setDauer(String(TERMINARTEN[wert].dauerMinuten));
    merken();
  }

  function ortWechseln(wert: string) {
    if (!istOrt(wert)) return;
    setOrt(wert);
    if (!erinnerungenAngefasst) {
      const [eins, zwei] = erinnerungsVorgaben(wert);
      setErinnerungen([eins, zwei, ...erinnerungen.slice(2)]);
    }
    merken();
  }

  // Kommt der Kunde über einen Vertriebspartner, ist der beim Termin fast
  // immer auch beteiligt — deshalb als Vorschlag übernehmen.
  function kundeWechseln(wert: string) {
    setKundeId(wert);
    const gewaehlt = kunden.find((kunde) => kunde.id === wert);
    setPartnerId(gewaehlt?.partnerId ?? OHNE_PARTNER);
    merken();
  }

  const zeigeVorbereitung =
    !bearbeiten && istTerminart(terminart) && TERMINARTEN[terminart].vorbereitungstermin;
  const zeigeSofortSenden =
    !bearbeiten && istTerminart(terminart) && TERMINARTEN[terminart].bestaetigungAnKunden;

  const neuerKunde = {
    vorname: zuletzt?.neuVorname ?? "",
    nachname: zuletzt?.neuNachname ?? "",
    email: zuletzt?.neuEmail ?? "",
    telefon: zuletzt?.neuTelefon ?? "",
    anrede: zuletzt?.neuAnrede ?? "du",
    anredeTitel: zuletzt?.neuAnredeTitel ?? "",
  };

  return (
    <form action={action} className="space-y-8" onChange={merken}>
      <MeldeStatus status={status} />

      {bearbeiten && <input type="hidden" name="id" value={termin.id} />}

      <div className="feld">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <span className="feld-beschriftung mb-0">Kunde</span>
          {!bearbeiten && kunden.length > 0 && (
            <Stufen
              name="kundeModus"
              aria-label="Bestehender oder neuer Kunde"
              klein
              wert={kundeModus}
              onChange={(wert) => {
                setKundeModus(wert as "bestehend" | "neu");
                merken();
              }}
              optionen={[
                { wert: "bestehend", label: "Bestehender Kunde" },
                { wert: "neu", label: "Neuer Kunde" },
              ]}
            />
          )}
        </div>

        {kundeModus === "neu" && !bearbeiten ? (
          <div className="rounded-feld border border-sand p-4 sm:p-6">
            {kunden.length === 0 && <input type="hidden" name="kundeModus" value="neu" />}
            <KundenFelder werte={neuerKunde} praefix="neu" onChange={merken} />
          </div>
        ) : (
          <KundenSuche id="kunde" name="kunde" kunden={kunden} wert={kundeId} onChange={kundeWechseln} />
        )}
      </div>

      <div className="feld">
        <span className="feld-beschriftung">Terminart</span>
        <Stufen
          name="terminart"
          aria-label="Terminart"
          wert={terminart}
          onChange={terminartWechseln}
          optionen={TERMINART_GRUPPEN.flatMap((gruppe, g) =>
            gruppe.map((art, i) => ({
              wert: art,
              label: TERMINARTEN[art].label,
              trennerDavor: g > 0 && i === 0,
            })),
          )}
        />
      </div>

      <div className="feld">
        <span className="feld-beschriftung">Ort</span>
        <Stufen
          name="ort"
          aria-label="Ort"
          wert={ort}
          onChange={ortWechseln}
          optionen={ORT_REIHENFOLGE.map((wert) => ({
            wert,
            label: ORTE[wert],
            icon: ORT_SYMBOLE[wert],
          }))}
        />
        {ort === "anderer" && (
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <Feld label="Straße und Hausnummer" htmlFor="ortStrasse">
              <Input
                id="ortStrasse"
                name="ortStrasse"
                defaultValue={zuletzt?.ortStrasse ?? termin?.ortStrasse ?? ""}
                autoComplete="off"
                placeholder="Berliner Allee 58"
              />
            </Feld>
            <Feld label="PLZ und Ort" htmlFor="ortPlzOrt">
              <Input
                id="ortPlzOrt"
                name="ortPlzOrt"
                defaultValue={zuletzt?.ortPlzOrt ?? termin?.ortPlzOrt ?? ""}
                autoComplete="off"
                placeholder="64295 Darmstadt"
              />
            </Feld>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <ZeitpunktFelder
          id="termin"
          datumName="datum"
          uhrzeitName="uhrzeit"
          datum={beginn.datum}
          uhrzeit={beginn.uhrzeit}
          onChange={merken}
        />
      </div>

      <div className="feld">
        <span className="feld-beschriftung">Dauer</span>
        <DauerStufen
          name="dauer"
          wert={dauer}
          onChange={(wert) => {
            setDauer(wert);
            merken();
          }}
        />
      </div>

      {partner.length > 0 && (
        <Feld label="Beteiligter Partner" htmlFor="partner">
          <Select
            name="partner"
            value={partnerId}
            onValueChange={(wert) => {
              setPartnerId(wert);
              merken();
            }}
          >
            <SelectTrigger id="partner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OHNE_PARTNER}>Kein Partner</SelectItem>
              {partner.map((eintrag) => (
                <SelectItem key={eintrag.id} value={eintrag.id}>
                  {eintrag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Feld>
      )}

      <div className="feld">
        <span className="feld-beschriftung">Erinnerungen an den Kunden</span>
        <div className="space-y-3">
          {erinnerungen.map((einstellung, index) => (
            <ErinnerungFeld
              key={index}
              nummer={index + 1}
              einstellung={einstellung}
              onChange={(neu) => {
                setErinnerungen(erinnerungen.map((e, i) => (i === index ? neu : e)));
                setErinnerungenAngefasst(true);
                merken();
              }}
              onEntfernen={
                index >= 2
                  ? () => {
                      setErinnerungen(erinnerungen.filter((_, i) => i !== index));
                      setErinnerungenAngefasst(true);
                      merken();
                    }
                  : undefined
              }
            />
          ))}
          {erinnerungen.length < ERINNERUNGEN_MAX && (
            <Button
              type="button"
              variante="leise"
              klein
              onClick={() => {
                setErinnerungen([...erinnerungen, naechsteErinnerung(erinnerungen)]);
                setErinnerungenAngefasst(true);
                merken();
              }}
            >
              <PlusIcon aria-hidden />
              Erinnerung hinzufügen
            </Button>
          )}
        </div>
      </div>

      <div className="feld">
        <span className="feld-beschriftung">Thema im Betreff</span>
        <NutzenAuswahl
          eigene={eigeneNutzen}
          gewaehlt={zuletzt ? zuletzt.nutzen.split("\n").filter(Boolean) : (termin?.nutzen ?? [])}
          onChange={merken}
        />
      </div>

      <Feld label="Notizen" htmlFor="notizen" optional>
        <Textarea
          id="notizen"
          name="notizen"
          rows={3}
          defaultValue={zuletzt?.notizen ?? termin?.notizen ?? ""}
        />
      </Feld>

      {zeigeVorbereitung && (
        <Aufklappen titel="Vorbereitungstermin gleich mitplanen">
          <div className="space-y-6 pt-2">
            <div className="grid gap-6 sm:grid-cols-2">
              <ZeitpunktFelder
                id="vorbereitung"
                datumName="vorbereitungDatum"
                uhrzeitName="vorbereitungUhrzeit"
                datum={zuletzt?.vorbereitungDatum ?? ""}
                uhrzeit={zuletzt?.vorbereitungUhrzeit ?? ""}
                pflicht={false}
                onChange={merken}
              />
            </div>
            <VorbereitungDauer defaultWert={zuletzt?.vorbereitungDauer ?? "60"} />
          </div>
        </Aufklappen>
      )}

      {zeigeSofortSenden && (
        <KaestchenZeile
          id="sofortSenden"
          name="sofortSenden"
          label="Bestätigung sofort an den Kunden senden"
          defaultChecked={zuletzt ? zuletzt.sofortSenden === "on" : true}
        />
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button type="submit" laeuft={laeuft} disabled={bearbeiten && !geaendert}>
          {laeuft
            ? "Wird gespeichert …"
            : bearbeiten
              ? "Änderungen speichern"
              : "Termin anlegen"}
        </Button>
        {!bearbeiten && (
          <Button asChild variante="sekundaer">
            <Link href="/termine">Abbrechen</Link>
          </Button>
        )}
      </div>
    </form>
  );
}

function VorbereitungDauer({ defaultWert }: { defaultWert: string }) {
  const [wert, setWert] = useState(defaultWert);
  return (
    <div className="feld">
      <span className="feld-beschriftung">Dauer</span>
      <DauerStufen name="vorbereitungDauer" wert={wert} onChange={setWert} />
    </div>
  );
}
