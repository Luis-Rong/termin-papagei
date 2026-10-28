"use client";

import { CalendarPlusIcon, Trash2Icon } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import {
  kalenderNachtragen,
  statusSetzen,
  terminLoeschen,
  vorbereitungAnlegen,
  vorbereitungBearbeiten,
} from "@/app/(app)/termine/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { DauerStufen } from "@/components/app/termin-formular";
import { ZeitpunktFelder } from "@/components/app/zeitpunkt-felder";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Feld } from "@/components/ui/feld";
import { Meldung } from "@/components/ui/meldung";
import { Stufen } from "@/components/ui/stufen";
import { Textarea } from "@/components/ui/textarea";
import { STATUS, type TerminStatus } from "@/lib/termine/terminarten";
import { teileZeitpunkt } from "@/lib/zeit";

/**
 * Status als Auswahl in Stufen — ein Klick, das Formular schickt sich selbst
 * ab. Kein Speichern-Knopf.
 */
export function StatusWaehlen({
  id,
  status,
}: {
  id: string;
  status: TerminStatus;
}) {
  const [meldung, action] = useActionState<FormularStatus, FormData>(
    statusSetzen,
    {},
  );
  const formular = useRef<HTMLFormElement>(null);

  return (
    <form ref={formular} action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Stufen
        key={status}
        name="status"
        aria-label="Status"
        klein
        defaultWert={status}
        onChange={() => formular.current?.requestSubmit()}
        optionen={Object.entries(STATUS).map(([wert, label]) => ({ wert, label }))}
      />
      {meldung.fehler && <Meldung art="fehler">{meldung.fehler}</Meldung>}
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
  const [geaendert, setGeaendert] = useState(false);
  const [dauer, setDauer] = useState(String(termin?.dauer ?? 60));

  const zeitpunkt = teileZeitpunkt(termin?.beginn ?? "");

  return (
    <form action={action} className="space-y-6" onChange={() => setGeaendert(true)}>
      <MeldeStatus status={meldung} />

      <input type="hidden" name="id" value={bearbeiten ? termin.id : elternId} />

      <div className={bearbeiten ? "grid gap-6 sm:grid-cols-2" : "grid gap-6"}>
        <ZeitpunktFelder
          id="vorbereitung"
          datumName="datum"
          uhrzeitName="uhrzeit"
          datum={zeitpunkt.datum}
          uhrzeit={zeitpunkt.uhrzeit}
          onChange={() => setGeaendert(true)}
        />
      </div>

      <div className="feld">
        <span className="feld-beschriftung">Dauer</span>
        <DauerStufen
          name="dauer"
          wert={dauer}
          onChange={(wert) => {
            setDauer(wert);
            setGeaendert(true);
          }}
        />
      </div>

      {bearbeiten && (
        <Feld label="Notizen" htmlFor="vorbereitung-notizen" optional>
          <Textarea
            id="vorbereitung-notizen"
            name="notizen"
            rows={3}
            defaultValue={termin.notizen}
          />
        </Feld>
      )}

      <Button
        type="submit"
        variante={bearbeiten ? "primaer" : "sekundaer"}
        klein={!bearbeiten}
        laeuft={laeuft}
        disabled={bearbeiten && !geaendert}
      >
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

      <Button type="submit" variante="sekundaer" klein laeuft={laeuft}>
        <CalendarPlusIcon aria-hidden />
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
        <Button variante="sekundaer" klein onClick={() => setNachfrage(true)}>
          <Trash2Icon aria-hidden />
          Termin löschen
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <MeldeStatus status={meldung} />
      <input type="hidden" name="id" value={id} />

      <Meldung art="fehler" wort="Löschen?">
        Der Termin verschwindet endgültig, ein zugehöriger Vorbereitungstermin
        mit ihm.
      </Meldung>

      <div className="flex flex-wrap gap-4">
        <Button type="submit" klein laeuft={laeuft}>
          {laeuft ? "Wird gelöscht …" : "Ja, endgültig löschen"}
        </Button>
        <Button
          type="button"
          variante="sekundaer"
          klein
          onClick={() => setNachfrage(false)}
          disabled={laeuft}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
