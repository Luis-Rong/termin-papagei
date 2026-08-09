"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZEIT_SLOTS } from "@/lib/zeit";

/**
 * Datum und Uhrzeit als zwei getrennte Felder.
 *
 * Statt eines `datetime-local`-Felds, dessen Aussehen der Browser bestimmt:
 * ein Datumsfeld und eine Auswahlliste im Viertelstundentakt. Die Liste passt
 * optisch zu den übrigen Auswahlfeldern und macht krumme Uhrzeiten unmöglich.
 *
 * Die beiden Felder werden serverseitig wieder zusammengesetzt
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
        <Input
          id={`${id}-datum`}
          name={datumName}
          type="date"
          defaultValue={datum}
          required={pflicht}
        />
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
