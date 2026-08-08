"use client";

import Link from "next/link";
import { useActionState } from "react";

import { anmelden, type FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  // Solange das Formular noch nichts gemeldet hat, zählt eine Meldung aus der URL
  // (z. B. ein abgelaufener Bestätigungslink).
  const anzeige: FormularStatus =
    status.fehler ?? status.hinweis
      ? status
      : vorabFehler
        ? { fehler: vorabFehler }
        : {};

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading text-3xl font-bold text-primary">Anmelden</h2>
        <p className="text-muted-foreground">
          Willkommen zurück. Melde dich mit deinem Konto an.
        </p>
      </div>

      <form action={action} className="space-y-4">
        {weiter ? <input type="hidden" name="weiter" value={weiter} /> : null}

        <MeldeStatus status={anzeige} />

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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="passwort">Passwort</Label>
            <Link
              href="/passwort-vergessen"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Passwort vergessen?
            </Link>
          </div>
          <Input
            id="passwort"
            name="passwort"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={laeuft}>
          {laeuft ? "Wird angemeldet …" : "Anmelden"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <Link
          href="/registrieren"
          className="text-primary underline-offset-4 hover:underline"
        >
          Jetzt registrieren
        </Link>
      </p>
    </div>
  );
}
