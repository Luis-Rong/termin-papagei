"use client";

import { ClockIcon } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Rad } from "@/components/ui/rad";
import { cn } from "@/lib/utils";
import { MINUTEN_AUSWAHL, normalisiereUhrzeit, STUNDEN_AUSWAHL } from "@/lib/zeit";

/** Die Einträge eines Rads — ein Wert außerhalb des Rasters wird einsortiert, damit er sichtbar bleibt. */
function mitWert(liste: string[], wert: string | undefined): { wert: string; label: string }[] {
  const alle = wert && !liste.includes(wert) ? [...liste, wert].sort() : liste;
  return alle.map((eintrag) => ({ wert: eintrag, label: eintrag }));
}

/**
 * Uhrzeit wie am Wecker: Ein Klick aufs Feld öffnet mittig die Räder für
 * Stunde und Viertelstunde. Wer lieber tippt, schreibt oben „930" oder
 * „14:30" — Enter übernimmt. Abgeschickt wird `name` als "09:30".
 */
export function UhrzeitFeld({
  id,
  name,
  wert,
  pflicht = true,
  onChange,
  className,
}: {
  id: string;
  name: string;
  /** "14:30" oder leer. */
  wert: string;
  pflicht?: boolean;
  onChange?: (wert: string) => void;
  className?: string;
}) {
  const [uhrzeit, setUhrzeit] = useState(wert);
  const [tipp, setTipp] = useState("");
  const [offen, setOffen] = useState(false);

  const [stunde = "", minute = ""] = uhrzeit.split(":");

  function setzen(neu: string) {
    setUhrzeit(neu);
    onChange?.(neu);
  }

  function radSetzen(neueStunde: string, neueMinute: string) {
    setzen(`${neueStunde || "09"}:${neueMinute || "00"}`);
  }

  function tippUebernehmen() {
    const sauber = normalisiereUhrzeit(tipp);
    if (sauber) {
      setzen(sauber);
      setTipp("");
      return true;
    }
    return false;
  }

  return (
    <Popover
      open={offen}
      onOpenChange={(neu) => {
        if (!neu) tippUebernehmen();
        setOffen(neu);
      }}
    >
      <input type="hidden" name={name} value={uhrzeit} required={pflicht} />
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "feld-eingabe flex cursor-pointer items-center justify-between gap-2 text-left",
            className,
          )}
        >
          {uhrzeit ? (
            <span className="tabellenziffern">{uhrzeit}</span>
          ) : (
            <span className="text-platzhalter">Wählen</span>
          )}
          <ClockIcon className="size-5 shrink-0 text-marine-mittel" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-auto p-3">
        <div className="space-y-2">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={tipp}
            placeholder={uhrzeit || "Tippen, z. B. 930"}
            aria-label="Uhrzeit tippen"
            className="feld-eingabe tabellenziffern h-10 min-h-0 text-center text-klein"
            onChange={(event) => setTipp(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (tippUebernehmen()) setOffen(false);
              }
            }}
          />
          <div className="rad-rahmen">
            <Rad
              label="Stunde"
              eintraege={mitWert(STUNDEN_AUSWAHL, stunde || undefined)}
              wert={stunde || "09"}
              onChange={(neu) => radSetzen(neu, minute)}
            />
            <span className="rad-doppelpunkt" aria-hidden>
              :
            </span>
            <Rad
              label="Minute"
              eintraege={mitWert(MINUTEN_AUSWAHL, minute || undefined)}
              wert={minute || "00"}
              onChange={(neu) => radSetzen(stunde, neu)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
