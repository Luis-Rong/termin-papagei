"use client";

import { CalendarPlus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import {
  kalenderNachtragen,
  statusSetzen,
  terminLoeschen,
  vorbereitungAnlegen,
  vorbereitungBearbeiten,
} from "@/app/(app)/termine/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { ZeitpunktFelder } from "@/components/app/zeitpunkt-felder";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DAUER_VORSCHLAEGE,
  dauerLabel,
  STATUS,
  type TerminStatus,
} from "@/lib/termine/terminarten";
import { teileZeitpunkt } from "@/lib/zeit";

/**
 * Status umschalten. Alle drei Knöpfe liegen in einem Formular — der geklickte
 * Knopf schickt seinen eigenen Wert im Feld `status` mit.
 */
export function StatusWaehlen({
  id,
  status,
}: {
  id: string;
  status: TerminStatus;
}) {
  const [meldung, action, laeuft] = useActionState<FormularStatus, FormData>(
    statusSetzen,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />

      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS).map(([wert, label]) => (
          <Button
            key={wert}
            type="submit"
            name="status"
            value={wert}
            size="sm"
            variant={wert === status ? "default" : "outline"}
            disabled={laeuft}
            aria-pressed={wert === status}
          >
            {label}
          </Button>
        ))}
      </div>

      {meldung.fehler && (
        <p className="text-sm text-destructive">{meldung.fehler}</p>
      )}
    </form>
  );
}

/**
 * Vorbereitungstermin anlegen oder bearbeiten.
 * Ohne `terminId` wird ein neuer an `elternId` gehängt.
 */
export function VorbereitungFormular({
  elternId,
  termin,
}: {
  elternId?: string;
  termin?: { id: string; beginn: string; dauer: number; notizen: string };
}) {
  const bearbeiten = termin !== undefined;
  const [meldung, action, laeuft] = useActionState<FormularStatus, FormData>(
    bearbeiten ? vorbereitungBearbeiten : vorbereitungAnlegen,
    {},
  );

  const zeitpunkt = teileZeitpunkt(termin?.beginn ?? "");

  return (
    <form action={action} className="space-y-4">
      <MeldeStatus status={meldung} />

      <input type="hidden" name="id" value={bearbeiten ? termin.id : elternId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <ZeitpunktFelder
          id="vorbereitung"
          datumName="datum"
          uhrzeitName="uhrzeit"
          datum={zeitpunkt.datum}
          uhrzeit={zeitpunkt.uhrzeit}
        />

        <div className="space-y-2">
          <Label htmlFor="vorbereitung-dauer">Dauer</Label>
          <Select name="dauer" defaultValue={String(termin?.dauer ?? 60)}>
            <SelectTrigger id="vorbereitung-dauer" className="w-full">
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

      {bearbeiten && (
        <div className="space-y-2">
          <Label htmlFor="vorbereitung-notizen">Notizen</Label>
          <Textarea
            id="vorbereitung-notizen"
            name="notizen"
            rows={3}
            defaultValue={termin.notizen}
          />
        </div>
      )}

      <Button type="submit" disabled={laeuft}>
        {laeuft
          ? "Wird gespeichert …"
          : bearbeiten
            ? "Änderungen speichern"
            : "Vorbereitungstermin anlegen"}
      </Button>
    </form>
  );
}

/**
 * Termin nachträglich in den Google-Kalender eintragen — nötig, wenn beim
 * Anlegen noch keine Verbindung bestand oder Google gerade streikte.
 */
export function KalenderNachtragen({
  id,
  beschriftung,
}: {
  id: string;
  beschriftung: string;
}) {
  const [meldung, action, laeuft] = useActionState<FormularStatus, FormData>(
    kalenderNachtragen,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <MeldeStatus status={meldung} />
      <input type="hidden" name="id" value={id} />

      <Button type="submit" variant="secondary" size="sm" disabled={laeuft}>
        <CalendarPlus aria-hidden />
        {laeuft ? "Wird eingetragen …" : beschriftung}
      </Button>
    </form>
  );
}

/** Löschen mit Rückfrage — erst der zweite Klick löscht wirklich. */
export function TerminLoeschen({ id }: { id: string }) {
  const [nachfrage, setNachfrage] = useState(false);
  const [meldung, action, laeuft] = useActionState<FormularStatus, FormData>(
    terminLoeschen,
    {},
  );

  if (!nachfrage) {
    return (
      <div className="space-y-3">
        <MeldeStatus status={meldung} />
        <Button variant="destructive" onClick={() => setNachfrage(true)}>
          <Trash2 aria-hidden />
          Termin löschen
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <MeldeStatus status={meldung} />
      <input type="hidden" name="id" value={id} />

      <p className="text-sm">
        Termin wirklich löschen? Ein zugehöriger Vorbereitungstermin
        verschwindet mit. Das lässt sich nicht rückgängig machen.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="destructive" disabled={laeuft}>
          {laeuft ? "Wird gelöscht …" : "Ja, endgültig löschen"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setNachfrage(false)}
          disabled={laeuft}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
