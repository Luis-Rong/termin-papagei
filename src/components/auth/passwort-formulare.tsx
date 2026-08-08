"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  passwortNeuSetzen,
  passwortVergessen,
  type FormularStatus,
} from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswortVergessenFormular() {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    passwortVergessen,
    {},
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading text-3xl font-bold text-primary">
          Passwort zurücksetzen
        </h2>
        <p className="text-muted-foreground">
          Wir schicken dir einen Link, mit dem du ein neues Passwort vergeben
          kannst.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <MeldeStatus status={status} />

        <div className="space-y-2">
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={status.werte?.email ?? ""}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={laeuft}>
          {laeuft ? "Wird gesendet …" : "Link anfordern"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </div>
  );
}

export function PasswortNeuFormular() {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    passwortNeuSetzen,
    {},
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading text-3xl font-bold text-primary">
          Neues Passwort vergeben
        </h2>
        <p className="text-muted-foreground">
          Wähle ein neues Passwort für dein Konto.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <MeldeStatus status={status} />

        <div className="space-y-2">
          <Label htmlFor="passwort">Neues Passwort</Label>
          <Input
            id="passwort"
            name="passwort"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wiederholung">Passwort wiederholen</Label>
          <Input
            id="wiederholung"
            name="wiederholung"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={laeuft}>
          {laeuft ? "Wird gespeichert …" : "Passwort speichern"}
        </Button>
      </form>
    </div>
  );
}
