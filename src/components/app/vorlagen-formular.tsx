"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  vorlageAnlegen,
  vorlageSpeichern,
  type VorlagenStatus,
} from "@/app/(app)/vorlagen/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
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
import { TERMINART_REIHENFOLGE, TERMINARTEN } from "@/lib/termine/terminarten";
import { ZWECK_REIHENFOLGE, ZWECKE } from "@/lib/vorlagen/typen";

export type VorlagenFormularWerte = {
  id: string;
  terminart: string;
  zweck: string;
  betreff: string;
  text: string;
};

/**
 * Formular zum Anlegen und Bearbeiten einer eigenen Vorlage.
 * Ohne `vorlage` wird eine neue angelegt, mit `vorlage` bearbeitet.
 */
export function VorlagenFormular({
  vorlage,
}: {
  vorlage?: VorlagenFormularWerte;
}) {
  const bearbeiten = vorlage !== undefined;
  const [status, action, laeuft] = useActionState<VorlagenStatus, FormData>(
    bearbeiten ? vorlageSpeichern : vorlageAnlegen,
    {},
  );

  // Nach einer Aktion leert React das Formular. `status.werte` enthält die
  // zuletzt abgeschickten Eingaben und füllt die Felder wieder auf.
  const werte = status.werte ?? {
    terminart: vorlage?.terminart ?? "erstgespraech",
    zweck: vorlage?.zweck ?? "bestaetigung",
    betreff: vorlage?.betreff ?? "",
    text: vorlage?.text ?? "",
  };

  return (
    <form action={action} className="space-y-4">
      <MeldeStatus status={status} />

      {bearbeiten && <input type="hidden" name="id" value={vorlage.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="terminart">Terminart</Label>
          <Select name="terminart" defaultValue={werte.terminart}>
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
          <Label htmlFor="zweck">Zweck</Label>
          <Select name="zweck" defaultValue={werte.zweck}>
            <SelectTrigger id="zweck" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZWECK_REIHENFOLGE.map((zweck) => (
                <SelectItem key={zweck} value={zweck}>
                  {ZWECKE[zweck]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="betreff">Betreff</Label>
        <Input
          id="betreff"
          name="betreff"
          defaultValue={werte.betreff}
          autoComplete="off"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="text">Text</Label>
        <Textarea
          id="text"
          name="text"
          rows={8}
          defaultValue={werte.text}
          required
        />
        <p className="text-xs text-muted-foreground">
          Platzhalter: <code>{"{{vorname}}"}</code>, <code>{"{{datum}}"}</code>,{" "}
          <code>{"{{uhrzeit}}"}</code>, <code>{"{{ort}}"}</code> — werden beim
          Versand durch die echten Termindaten ersetzt. Deine Signatur aus den
          Einstellungen hängt automatisch darunter, muss also nicht mit rein.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={laeuft}>
          {laeuft
            ? "Wird gespeichert …"
            : bearbeiten
              ? "Änderungen speichern"
              : "Vorlage anlegen"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/vorlagen">Abbrechen</Link>
        </Button>
      </div>
    </form>
  );
}
