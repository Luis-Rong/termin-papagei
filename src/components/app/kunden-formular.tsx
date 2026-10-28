"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  kundeAnlegen,
  kundeSpeichern,
  type KundenStatus,
} from "@/app/(app)/kunden/actions";
import { KundenFelder } from "@/components/app/kunden-felder";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Feld } from "@/components/ui/feld";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EIGENER_KUNDE } from "@/lib/partner/typen";

export type KundenFormularWerte = {
  id: string;
  vorname: string;
  nachname: string;
  telefon: string;
  email: string;
  anrede: string;
  anredeTitel: string;
  /** Id des Vertriebspartners — leer, wenn es ein eigener Kunde ist. */
  partnerId: string;
};

/** Ein Eintrag der Auswahlliste „Herkunft". */
export type PartnerAuswahl = {
  id: string;
  name: string;
  /** Beim Kunden hinterlegt, aber die Partnerschaft besteht nicht mehr. */
  beendet?: boolean;
};

/**
 * Formular zum Anlegen und Bearbeiten eines Kunden. Ohne `kunde` wird ein
 * neuer angelegt, mit `kunde` bearbeitet — dann ist „Änderungen speichern"
 * erst aktiv, wenn sich etwas geändert hat.
 */
export function KundenFormular({
  kunde,
  partnerAuswahl,
}: {
  kunde?: KundenFormularWerte;
  partnerAuswahl: PartnerAuswahl[];
}) {
  const bearbeiten = kunde !== undefined;
  const [status, action, laeuft] = useActionState<KundenStatus, FormData>(
    bearbeiten ? kundeSpeichern : kundeAnlegen,
    {},
  );
  const [geaendert, setGeaendert] = useState(false);

  // Nach einer Aktion leert React das Formular. `status.werte` enthält die
  // zuletzt abgeschickten Eingaben und füllt die Felder wieder auf.
  const werte = status.werte ?? {
    vorname: kunde?.vorname ?? "",
    nachname: kunde?.nachname ?? "",
    telefon: kunde?.telefon ?? "",
    email: kunde?.email ?? "",
    anrede: kunde?.anrede ?? "du",
    anredeTitel: kunde?.anredeTitel ?? "",
    partner: kunde?.partnerId || EIGENER_KUNDE,
  };

  return (
    <form action={action} className="space-y-6" onChange={() => setGeaendert(true)}>
      <MeldeStatus status={status} />

      {bearbeiten && <input type="hidden" name="id" value={kunde.id} />}

      <KundenFelder werte={werte} onChange={() => setGeaendert(true)} />

      {/* Ohne bestätigte Partner gibt es nichts zu wählen — dann bleibt das Feld weg. */}
      {partnerAuswahl.length > 0 && (
        <Feld label="Herkunft" htmlFor="partner">
          <Select
            name="partner"
            defaultValue={werte.partner || EIGENER_KUNDE}
            onValueChange={() => setGeaendert(true)}
          >
            <SelectTrigger id="partner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EIGENER_KUNDE}>Eigener Kunde</SelectItem>
              {partnerAuswahl.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  Kunde von {partner.name}
                  {partner.beendet && " (Partnerschaft beendet)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Feld>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button type="submit" laeuft={laeuft} disabled={bearbeiten && !geaendert}>
          {laeuft
            ? "Wird gespeichert …"
            : bearbeiten
              ? "Änderungen speichern"
              : "Kunde anlegen"}
        </Button>
        {!bearbeiten && (
          <Button asChild variante="sekundaer">
            <Link href="/kunden">Abbrechen</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
