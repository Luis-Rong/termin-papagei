"use client";

import { BracesIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PLATZHALTER, type Platzhalter } from "@/lib/vorlagen/typen";

/**
 * Ein Knopf, der die Platzhalter aufklappt — Vorname, Nachname, Anrede,
 * Berater, Tag, Datum, Uhrzeit, Ort. Ein Klick fügt `{{…}}` dort ein, wo
 * der Aufrufer die Schreibmarke hat.
 */
export function PlatzhalterMenue({
  onWaehlen,
  eintraege = PLATZHALTER,
  klein = true,
}: {
  onWaehlen: (platzhalter: Platzhalter) => void;
  eintraege?: readonly Platzhalter[];
  klein?: boolean;
}) {
  const [offen, setOffen] = useState(false);

  return (
    <Popover open={offen} onOpenChange={setOffen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variante="leise"
          klein={klein}
          aria-label="Platzhalter einfügen"
          title="Platzhalter einfügen"
          onMouseDown={(event) => event.preventDefault()}
        >
          <BracesIcon aria-hidden />
          Platzhalter
          <ChevronDownIcon aria-hidden className="size-4!" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <ul role="menu">
          {eintraege.map((eintrag) => (
            <li key={eintrag.wert}>
              <button
                type="button"
                role="menuitem"
                className="menue-eintrag w-full justify-between text-left"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onWaehlen(eintrag);
                  setOffen(false);
                }}
              >
                <span>{eintrag.label}</span>
                <span className="text-klein text-platzhalter">{eintrag.wert}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
