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
import { Feld } from "@/components/ui/feld";
import { Input } from "@/components/ui/input";

export function PasswortVergessenFormular() {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    passwortVergessen,
    {},
  );

  return (
    <div className="space-y-8">
      <h2 className="font-serif text-h2 text-marine">Passwort zurücksetzen</h2>

      <form action={action} className="space-y-6">
        <MeldeStatus status={status} />

        <Feld label="E-Mail-Adresse" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={status.werte?.email ?? ""}
            required
          />
        </Feld>

        <Button type="submit" voll laeuft={laeuft}>
          {laeuft ? "Wird gesendet …" : "Link anfordern"}
        </Button>
      </form>

      <p className="text-klein">
        <Link href="/login">Zur Anmeldung</Link>
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
    <div className="space-y-8">
      <h2 className="font-serif text-h2 text-marine">Neues Passwort</h2>

      <form action={action} className="space-y-6">
        <MeldeStatus status={status} />

        <Feld label="Neues Passwort · mindestens 8 Zeichen" htmlFor="passwort">
          <Input
            id="passwort"
            name="passwort"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Feld>

        <Feld label="Passwort wiederholen" htmlFor="wiederholung">
          <Input
            id="wiederholung"
            name="wiederholung"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Feld>

        <Button type="submit" voll laeuft={laeuft}>
          {laeuft ? "Wird gespeichert …" : "Passwort speichern"}
        </Button>
      </form>
    </div>
  );
}
