"use client";

import { CalendarIcon } from "lucide-react";
import { de } from "date-fns/locale";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  alsDatumsWert,
  alsKalenderTag,
  formatiereDatumsWert,
  ZEIT_SLOTS,
} from "@/lib/zeit";

/**
 * Datumsauswahl über einen Kalender statt über das native Datumsfeld: Dessen
 * Aussehen bestimmt der Browser, und es passte nicht zu den Auswahlfeldern
 * daneben. Der gewählte Tag wandert in ein verstecktes Feld, damit das
 * Formular unverändert `datum` abschickt.
 */
function DatumWaehler({
  id,
  name,
  wert,
}: {
  id: string;
  name: string;
  wert: string;
}) {
  const [datum, setDatum] = useState(wert);
  const [offen, setOffen] = useState(false);

  const gewaehlt = datum ? alsKalenderTag(datum) : undefined;

  return (
    <>
      <input type="hidden" name={name} value={datum} />

      <Popover open={offen} onOpenChange={setOffen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            // Bewusst wie der Auswahlfeld-Knopf daneben: gleiche Höhe, gleicher
            // Rahmen, gleiche Schrift.
            className="w-full justify-between border-input bg-transparent font-normal"
          >
            {datum ? (
              formatiereDatumsWert(datum)
            ) : (
              <span className="text-muted-foreground">Auswählen</span>
            )}
            <CalendarIcon className="text-muted-foreground" aria-hidden />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={gewaehlt}
            defaultMonth={gewaehlt}
            locale={de}
            autoFocus
            onSelect={(tag) => {
              if (!tag) return;
              setDatum(alsDatumsWert(tag));
              setOffen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

/**
 * Datum und Uhrzeit als zwei getrennte Felder: ein Kalender und eine
 * Auswahlliste im Viertelstundentakt. Beides passt optisch zu den übrigen
 * Feldern und macht krumme Uhrzeiten unmöglich.
 *
 * Die beiden Werte werden serverseitig wieder zusammengesetzt
 * (`fuegeZeitpunktZusammen` in src/lib/zeit.ts).
 */
export function ZeitpunktFelder({
  id,
  datumName,
  uhrzeitName,
  datum,
  uhrzeit,
  pflicht = true,
}: {
  /** Präfix für die Feld-Ids, damit zwei Blöcke in einem Formular möglich sind. */
  id: string;
  datumName: string;
  uhrzeitName: string;
  datum: string;
  uhrzeit: string;
  pflicht?: boolean;
}) {
  // Ein früher angelegter Termin kann eine Uhrzeit außerhalb des Rasters haben.
  // Die bleibt in der Liste, damit bloßes Speichern sie nicht verschiebt.
  const zeiten =
    uhrzeit && !ZEIT_SLOTS.includes(uhrzeit)
      ? [uhrzeit, ...ZEIT_SLOTS]
      : ZEIT_SLOTS;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${id}-datum`}>Datum</Label>
        <DatumWaehler id={`${id}-datum`} name={datumName} wert={datum} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-uhrzeit`}>Uhrzeit</Label>
        <Select
          name={uhrzeitName}
          defaultValue={uhrzeit || undefined}
          required={pflicht}
        >
          <SelectTrigger id={`${id}-uhrzeit`} className="w-full">
            <SelectValue placeholder="Auswählen" />
          </SelectTrigger>
          <SelectContent>
            {zeiten.map((zeit) => (
              <SelectItem key={zeit} value={zeit}>
                {zeit} Uhr
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
