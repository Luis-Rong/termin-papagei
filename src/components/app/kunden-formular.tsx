"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  kundeAnlegen,
  kundeSpeichern,
  type KundenStatus,
} from "@/app/(app)/kunden/actions";
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
import { EIGENER_KUNDE } from "@/lib/partner/typen";

export type KundenFormularWerte = {
  id: string;
  vorname: string;
  nachname: string;
  telefon: string;
  email: string;
  /** Id des Vertriebspartners — leer, wenn es ein eigener Kunde ist. */
  partnerId: string;
};

/** Ein Eintrag der Auswahlliste „Kunde eines Vertriebspartners". */
export type PartnerAuswahl = {
  id: string;
  name: string;
  /** Beim Kunden hinterlegt, aber die Partnerschaft besteht nicht mehr. */
  beendet?: boolean;
};

/**
 * Formular zum Anlegen und Bearbeiten eines Kunden.
 * Ohne `kunde` wird ein neuer Datensatz angelegt, mit `kunde` bearbeitet.
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

  // Nach einer Aktion leert React das Formular. `status.werte` enthält die
  // zuletzt abgeschickten Eingaben und füllt die Felder wieder auf.
  const werte = status.werte ?? {
    vorname: kunde?.vorname ?? "",
    nachname: kunde?.nachname ?? "",
    telefon: kunde?.telefon ?? "",
    email: kunde?.email ?? "",
    partner: kunde?.partnerId || EIGENER_KUNDE,
  };

  return (
    <form action={action} className="space-y-4">
      <MeldeStatus status={status} />

      {bearbeiten && <input type="hidden" name="id" value={kunde.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vorname">Vorname</Label>
          <Input
            id="vorname"
            name="vorname"
            defaultValue={werte.vorname}
            autoComplete="off"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nachname">Nachname</Label>
          <Input
            id="nachname"
            name="nachname"
            defaultValue={werte.nachname}
            autoComplete="off"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={werte.email}
            autoComplete="off"
            placeholder="name@beispiel.de"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefon">Telefon</Label>
          <Input
            id="telefon"
            name="telefon"
            type="tel"
            defaultValue={werte.telefon}
            autoComplete="off"
            placeholder="0151 23456789"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        E-Mail oder Telefon — mindestens eines von beiden wird gebraucht. Die
        Terminbestätigungen gehen später an die E-Mail-Adresse.
      </p>

      <div className="space-y-2">
        <Label htmlFor="partner">Herkunft</Label>
        {/* Radix legt für die Auswahl ein verstecktes Feld an, das mit dem
            Formular abgeschickt wird — deshalb genügt hier `name`. */}
        <Select name="partner" defaultValue={werte.partner || EIGENER_KUNDE}>
          <SelectTrigger id="partner" className="w-full">
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
        {partnerAuswahl.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Du hast noch keine bestätigten Partner.{" "}
            <Link href="/partner" className="underline underline-offset-4">
              Partner suchen und verbinden
            </Link>{" "}
            — danach lassen sich Kunden einem Vertriebspartner zuordnen.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={laeuft}>
          {laeuft
            ? "Wird gespeichert …"
            : bearbeiten
              ? "Änderungen speichern"
              : "Kunde anlegen"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/kunden">Abbrechen</Link>
        </Button>
      </div>
    </form>
  );
}
