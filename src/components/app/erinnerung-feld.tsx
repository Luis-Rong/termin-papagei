"use client";

import { ChevronDownIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Rad } from "@/components/ui/rad";
import { Schalter } from "@/components/ui/schalter";
import {
  einheitWort,
  ERINNERUNG_TAGE_MAX,
  ERINNERUNG_WOCHEN_MAX,
  erinnerungSatz,
  tagWort,
  vorlaufStunden,
  vorlaufTeile,
  type ErinnerungsEinstellung,
  type VorlaufEinheit,
} from "@/lib/termine/terminarten";
import { MINUTEN_AUSWAHL, STUNDEN_AUSWAHL } from "@/lib/zeit";

const ZAHLEN: Record<VorlaufEinheit, string[]> = {
  stunden: Array.from({ length: 48 }, (_, i) => String(i + 1)),
  tage: Array.from({ length: ERINNERUNG_TAGE_MAX }, (_, i) => String(i + 1)),
  wochen: Array.from({ length: ERINNERUNG_WOCHEN_MAX }, (_, i) => String(i + 1)),
};
const EINHEITEN: VorlaufEinheit[] = ["stunden", "tage", "wochen"];

export { erinnerungSatz };

/**
 * Eine Kunden-Erinnerung: Kästchen an/aus, daneben die Einstellung als
 * Feld. Ein Klick darauf öffnet die Räder wie am Wecker — Zahl und Einheit
 * („2 Stunden vorher") oder, mit dem Schalter „Feste Uhrzeit", Tag und
 * Uhrzeit („Am Termintag, 09:00 Uhr"). Abgeschickt werden
 * erinnerung<N>Aktiv/Modus/Stunden/Tage/Uhrzeit.
 */
export function ErinnerungFeld({
  nummer,
  einstellung,
  onChange,
  onEntfernen,
}: {
  nummer: number;
  einstellung: ErinnerungsEinstellung;
  onChange: (einstellung: ErinnerungsEinstellung) => void;
  /** Nur bei zusätzlichen Erinnerungen (ab der dritten). */
  onEntfernen?: () => void;
}) {
  const [offen, setOffen] = useState(false);
  const praefix = `erinnerung${nummer}`;

  const { zahl, einheit } = vorlaufTeile(einstellung.stunden);
  const [stunde = "09", minute = "00"] = einstellung.uhrzeit.split(":");

  function setze(teil: Partial<ErinnerungsEinstellung>) {
    onChange({ ...einstellung, ...teil });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <input type="hidden" name={`${praefix}Modus`} value={einstellung.modus} />
      <input type="hidden" name={`${praefix}Stunden`} value={einstellung.stunden} />
      <input type="hidden" name={`${praefix}Tage`} value={einstellung.tage} />
      <input type="hidden" name={`${praefix}Uhrzeit`} value={einstellung.uhrzeit} />

      <div className="kaestchen-zeile w-40">
        <Checkbox
          id={`${praefix}Aktiv`}
          name={`${praefix}Aktiv`}
          checked={einstellung.aktiv}
          onCheckedChange={(wert) => setze({ aktiv: wert === true })}
        />
        <label htmlFor={`${praefix}Aktiv`} className="cursor-pointer select-none">
          {nummer}. Erinnerung
        </label>
      </div>

      <Popover open={offen} onOpenChange={setOffen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={!einstellung.aktiv}
            aria-label={`${nummer}. Erinnerung: ${erinnerungSatz(einstellung)}`}
            className="feld-eingabe flex w-auto min-w-60 cursor-pointer items-center justify-between gap-3 text-left"
          >
            <span>{erinnerungSatz(einstellung)}</span>
            <ChevronDownIcon className="size-5 shrink-0 text-marine-mittel" aria-hidden />
          </button>
        </PopoverTrigger>

        <PopoverContent align="center" className="w-auto p-3">
          <div className="space-y-2">
            <div className="flex justify-end px-1">
              <Schalter
                label="Feste Uhrzeit"
                eingeschaltet={einstellung.modus === "uhrzeit"}
                onChange={(an) => setze({ modus: an ? "uhrzeit" : "vorlauf" })}
              />
            </div>

            {einstellung.modus === "vorlauf" ? (
              <div className="rad-rahmen">
                <Rad
                  label="Zahl"
                  eintraege={ZAHLEN[einheit].map((n) => ({ wert: n, label: n }))}
                  wert={String(zahl)}
                  onChange={(neu) => setze({ stunden: vorlaufStunden(Number(neu), einheit) })}
                />
                <Rad
                  label="Einheit"
                  breit
                  eintraege={EINHEITEN.map((e) => ({ wert: e, label: `${einheitWort(e, zahl)} vorher` }))}
                  wert={einheit}
                  onChange={(neu) =>
                    setze({ stunden: vorlaufStunden(Math.min(zahl, ZAHLEN[neu as VorlaufEinheit].length), neu as VorlaufEinheit) })
                  }
                />
              </div>
            ) : (
              <div className="rad-rahmen">
                <Rad
                  label="Tag"
                  breit
                  eintraege={Array.from({ length: ERINNERUNG_TAGE_MAX + 1 }, (_, tage) => ({
                    wert: String(tage),
                    label: tagWort(tage),
                  }))}
                  wert={String(einstellung.tage)}
                  onChange={(neu) => setze({ tage: Number(neu) })}
                />
                <Rad
                  label="Stunde"
                  eintraege={STUNDEN_AUSWAHL.map((h) => ({ wert: h, label: h }))}
                  wert={stunde}
                  onChange={(neu) => setze({ uhrzeit: `${neu}:${minute}` })}
                />
                <span className="rad-doppelpunkt" aria-hidden>
                  :
                </span>
                <Rad
                  label="Minute"
                  eintraege={MINUTEN_AUSWAHL.map((m) => ({ wert: m, label: m }))}
                  wert={minute}
                  onChange={(neu) => setze({ uhrzeit: `${stunde}:${neu}` })}
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {onEntfernen && (
        <button
          type="button"
          aria-label={`${nummer}. Erinnerung entfernen`}
          title="Entfernen"
          className="knopf knopf-leise knopf-klein knopf-symbol text-marine-mittel"
          onClick={onEntfernen}
        >
          <XIcon aria-hidden />
        </button>
      )}
    </div>
  );
}
