"use client";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { de } from "date-fns/locale";
import { useState } from "react";

import { UhrzeitFeld } from "@/components/app/uhrzeit-feld";
import { Calendar } from "@/components/ui/calendar";
import { Feld } from "@/components/ui/feld";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { alsDatumsWert, alsKalenderTag, formatiereDatumsWert } from "@/lib/zeit";

const MONATE = Array.from({ length: 12 }, (_, i) =>
  new Date(2026, i, 1).toLocaleDateString("de-DE", { month: "short" }).replace(".", ""),
);

/**
 * Datumsauswahl über den Monatskalender statt über das native Datumsfeld,
 * dessen Aussehen der Browser bestimmt. Ein Klick auf „Oktober 2026" oben
 * springt in die Monatsansicht: Jahr blättern, Monat antippen, fertig.
 * Der gewählte Tag wandert in ein verstecktes Feld, damit das Formular
 * unverändert `datum` abschickt.
 */
export function DatumWaehler({
  id,
  name,
  wert,
  onChange,
}: {
  id: string;
  name: string;
  wert: string;
  onChange?: (wert: string) => void;
}) {
  const [datum, setDatum] = useState(wert);
  const [offen, setOffen] = useState(false);
  const [ansicht, setAnsicht] = useState<"tage" | "monate">("tage");
  const [monat, setMonat] = useState<Date>(() => alsKalenderTag(wert) ?? new Date());

  const gewaehlt = datum ? alsKalenderTag(datum) : undefined;

  function blaettern(monate: number) {
    setMonat(new Date(monat.getFullYear(), monat.getMonth() + monate, 1));
  }

  return (
    <>
      <input type="hidden" name={name} value={datum} />

      <Popover
        open={offen}
        onOpenChange={(neu) => {
          setOffen(neu);
          if (neu) {
            setAnsicht("tage");
            setMonat(gewaehlt ?? new Date());
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="feld-eingabe flex cursor-pointer items-center justify-between gap-2 text-left"
          >
            {datum ? (
              <span className="tabellenziffern">{formatiereDatumsWert(datum)}</span>
            ) : (
              <span className="text-platzhalter">Wählen</span>
            )}
            <CalendarIcon className="size-5 shrink-0 text-marine-mittel" aria-hidden />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              aria-label={ansicht === "tage" ? "Voriger Monat" : "Voriges Jahr"}
              className="knopf knopf-leise knopf-klein knopf-symbol"
              onClick={() => (ansicht === "tage" ? blaettern(-1) : blaettern(-12))}
            >
              <ChevronLeftIcon aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed={ansicht === "monate"}
              className="knopf knopf-leise knopf-klein font-serif text-h4 font-medium"
              onClick={() => setAnsicht(ansicht === "tage" ? "monate" : "tage")}
            >
              {ansicht === "tage"
                ? monat.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
                : String(monat.getFullYear())}
            </button>
            <button
              type="button"
              aria-label={ansicht === "tage" ? "Nächster Monat" : "Nächstes Jahr"}
              className="knopf knopf-leise knopf-klein knopf-symbol"
              onClick={() => (ansicht === "tage" ? blaettern(1) : blaettern(12))}
            >
              <ChevronRightIcon aria-hidden />
            </button>
          </div>

          {ansicht === "monate" ? (
            <div className="mt-2 grid w-[280px] grid-cols-3 gap-1 p-1">
              {MONATE.map((label, i) => {
                const istGewaehlt =
                  gewaehlt?.getFullYear() === monat.getFullYear() && gewaehlt?.getMonth() === i;
                const istHeute =
                  new Date().getFullYear() === monat.getFullYear() && new Date().getMonth() === i;
                return (
                  <button
                    key={label}
                    type="button"
                    className={cn(
                      "flex h-11 cursor-pointer items-center justify-center rounded-feld text-body text-marine transition-colors hover:bg-papier",
                      istHeute && "bg-creme",
                      istGewaehlt && "bg-marine text-weiss hover:bg-marine-tief",
                    )}
                    onClick={() => {
                      setMonat(new Date(monat.getFullYear(), i, 1));
                      setAnsicht("tage");
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <Calendar
              mode="single"
              selected={gewaehlt}
              month={monat}
              onMonthChange={setMonat}
              hideNavigation
              classNames={{ month_caption: "hidden", nav: "hidden" }}
              locale={de}
              autoFocus
              onSelect={(tag) => {
                if (!tag) return;
                const neu = alsDatumsWert(tag);
                setDatum(neu);
                onChange?.(neu);
                setOffen(false);
              }}
            />
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}

/**
 * Datum und Uhrzeit als zwei Felder: Kalender und Uhrzeit-Rad. Serverseitig
 * wieder zusammengesetzt (`fuegeZeitpunktZusammen` in src/lib/zeit.ts).
 */
export function ZeitpunktFelder({
  id,
  datumName,
  uhrzeitName,
  datum,
  uhrzeit,
  pflicht = true,
  onChange,
}: {
  /** Präfix für die Feld-Ids, damit zwei Blöcke in einem Formular möglich sind. */
  id: string;
  datumName: string;
  uhrzeitName: string;
  datum: string;
  uhrzeit: string;
  pflicht?: boolean;
  onChange?: () => void;
}) {
  return (
    <>
      <Feld label="Datum" htmlFor={`${id}-datum`} optional={!pflicht}>
        <DatumWaehler id={`${id}-datum`} name={datumName} wert={datum} onChange={onChange} />
      </Feld>

      <Feld label="Uhrzeit" htmlFor={`${id}-uhrzeit`} optional={!pflicht}>
        <UhrzeitFeld
          id={`${id}-uhrzeit`}
          name={uhrzeitName}
          wert={uhrzeit}
          pflicht={pflicht}
          onChange={onChange}
        />
      </Feld>
    </>
  );
}
