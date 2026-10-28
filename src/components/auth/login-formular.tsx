"use client";

import Link from "next/link";
import { useActionState } from "react";

import { anmelden, type FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Feld } from "@/components/ui/feld";
import { Input } from "@/components/ui/input";

export function LoginFormular({
  weiter,
  vorabFehler,
}: {
  weiter?: string;
  vorabFehler?: string;
}) {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    anmelden,
    {},
  );

  // Solange das Formular noch nichts gemeldet hat, zählt eine Meldung aus der
  // URL (z. B. ein abgelaufener Bestätigungslink).
  const anzeige: FormularStatus =
    status.fehler ?? status.hinweis
      ? status
      : vorabFehler
        ? { fehler: vorabFehler }
        : {};

  return (
    <div className="space-y-8">
      <h2 className="font-serif text-h2 text-marine">Anmelden</h2>

      <form action={action} className="space-y-6">
        {weiter ? <input type="hidden" name="weiter" value={weiter} /> : null}

        <MeldeStatus status={anzeige} />

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

        <Feld label="Passwort" htmlFor="passwort">
          <Input
            id="passwort"
            name="passwort"
            type="password"
            autoComplete="current-password"
            required
          />
        </Feld>

        <Button type="submit" voll laeuft={laeuft}>
          {laeuft ? "Wird angemeldet …" : "Anmelden"}
        </Button>
      </form>

      <div className="flex flex-wrap justify-between gap-4 text-klein">
        <Link href="/passwort-vergessen">Passwort vergessen?</Link>
        <Link href="/registrieren">Konto erstellen</Link>
      </div>
    </div>
  );
}
