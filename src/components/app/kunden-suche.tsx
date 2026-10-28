"use client";

import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { suchWoerter } from "@/lib/suche";

export type SuchKunde = { id: string; name: string };

/**
 * Kundenauswahl mit Suche: Tippen filtert die Liste, Enter nimmt den obersten
 * Treffer, Klick nimmt den Eintrag. Schickt `name=<id>` ab.
 */
export function KundenSuche({
  id,
  name,
  kunden,
  wert,
  onChange,
}: {
  id: string;
  name: string;
  kunden: SuchKunde[];
  wert: string;
  onChange: (id: string) => void;
}) {
  const [offen, setOffen] = useState(false);
  const [suche, setSuche] = useState("");

  const gewaehlt = kunden.find((kunde) => kunde.id === wert);
  const woerter = suchWoerter(suche).map((wort) => wort.toLowerCase());
  const treffer = kunden.filter((kunde) =>
    woerter.every((wort) => kunde.name.toLowerCase().includes(wort)),
  );

  function waehlen(kunde: SuchKunde) {
    onChange(kunde.id);
    setSuche("");
    setOffen(false);
  }

  return (
    <Popover open={offen} onOpenChange={setOffen}>
      <input type="hidden" name={name} value={wert} required />
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className="feld-eingabe flex cursor-pointer items-center justify-between gap-2 text-left"
        >
          {gewaehlt ? (
            <span>{gewaehlt.name}</span>
          ) : (
            <span className="text-platzhalter">Kunden wählen</span>
          )}
          <ChevronDownIcon className="size-5 shrink-0 text-marine-mittel" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2">
        <div className="relative mb-2">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-marine-mittel"
            aria-hidden
          />
          <input
            type="text"
            autoFocus
            autoComplete="off"
            value={suche}
            placeholder="Name tippen"
            aria-label="Kunden suchen"
            className="feld-eingabe h-10 min-h-0 pl-9 text-klein"
            onChange={(event) => setSuche(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (treffer[0]) waehlen(treffer[0]);
              }
              if (event.key === "Escape") setOffen(false);
            }}
          />
        </div>
        <ul role="listbox" className="max-h-64 overflow-y-auto">
          {treffer.map((kunde, index) => (
            <li key={kunde.id}>
              <button
                type="button"
                role="option"
                aria-selected={kunde.id === wert}
                className="menue-eintrag w-full text-left"
                data-state={kunde.id === wert ? "checked" : index === 0 && suche ? "vorschlag" : undefined}
                onClick={() => waehlen(kunde)}
              >
                {kunde.name}
              </button>
            </li>
          ))}
          {treffer.length === 0 && (
            <li className="px-4 py-3 text-klein text-marine-mittel">Kein Kunde passt.</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
