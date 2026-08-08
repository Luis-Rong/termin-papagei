"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registrieren, type FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegistrierFormular() {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    registrieren,
    {},
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading text-3xl font-bold text-primary">
          Konto erstellen
        </h2>
        <p className="text-muted-foreground">
          Für die Registrierung brauchst du den Einladungscode eures Teams.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <MeldeStatus status={status} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vorname">Vorname</Label>
            <Input id="vorname" name="vorname" autoComplete="given-name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nachname">Nachname</Label>
            <Input
              id="nachname"
              name="nachname"
              autoComplete="family-name"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="firma">
            Firma <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="firma" name="firma" autoComplete="organization" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="passwort">Passwort</Label>
          <Input
            id="passwort"
            name="passwort"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="einladungscode">Einladungscode</Label>
          <Input id="einladungscode" name="einladungscode" required />
        </div>

        <Button type="submit" className="w-full" disabled={laeuft}>
          {laeuft ? "Konto wird erstellt …" : "Konto erstellen"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Schon registriert?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Zur Anmeldung
        </Link>
      </p>
    </div>
  );
}
