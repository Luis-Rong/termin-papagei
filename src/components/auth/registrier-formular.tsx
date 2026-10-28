"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registrieren, type FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Feld } from "@/components/ui/feld";
import { Input } from "@/components/ui/input";

export function RegistrierFormular() {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    registrieren,
    {},
  );

  // React leert das Formular nach jeder Aktion. `status.werte` enthält die
  // zuletzt abgeschickten Eingaben — das Passwort bewusst nicht.
  const wert = (feld: string) => status.werte?.[feld] ?? "";

  return (
    <div className="space-y-8">
      <h2 className="font-serif text-h2 text-marine">Konto erstellen</h2>

      <form action={action} className="space-y-6">
        <MeldeStatus status={status} />

        <div className="grid gap-6 sm:grid-cols-2">
          <Feld label="Vorname" htmlFor="vorname">
            <Input
              id="vorname"
              name="vorname"
              autoComplete="given-name"
              defaultValue={wert("vorname")}
              required
            />
          </Feld>
          <Feld label="Nachname" htmlFor="nachname">
            <Input
              id="nachname"
              name="nachname"
              autoComplete="family-name"
              defaultValue={wert("nachname")}
              required
            />
          </Feld>
        </div>

        <Feld label="Firma" htmlFor="firma" optional>
          <Input
            id="firma"
            name="firma"
            autoComplete="organization"
            defaultValue={wert("firma")}
          />
        </Feld>

        <Feld label="E-Mail-Adresse" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={wert("email")}
            required
          />
        </Feld>

        <Feld label="Passwort · mindestens 8 Zeichen" htmlFor="passwort">
          <Input
            id="passwort"
            name="passwort"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Feld>

        <Feld label="Einladungscode" htmlFor="einladungscode">
          <Input
            id="einladungscode"
            name="einladungscode"
            defaultValue={wert("einladungscode")}
            required
          />
        </Feld>

        <Button type="submit" voll laeuft={laeuft}>
          {laeuft ? "Konto wird erstellt …" : "Konto erstellen"}
        </Button>
      </form>

      <p className="text-klein">
        <Link href="/login">Zur Anmeldung</Link>
      </p>
    </div>
  );
}
