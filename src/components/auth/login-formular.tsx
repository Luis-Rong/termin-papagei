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

        {/*
          Der Link steht im HTML absichtlich NACH dem Eingabefeld: Die Tab-Taste
          folgt der Reihenfolge im HTML, und so springt man vom E-Mail-Feld
          direkt ins Passwortfeld statt auf „Passwort vergessen?".
          Die order-Klassen setzen ihn optisch wieder neben die Beschriftung.
        */}
        <div className="flex flex-wrap items-center gap-y-2">
          <Label htmlFor="passwort" className="order-1 flex-1">
            Passwort
          </Label>
          <Input
            id="passwort"
            name="passwort"
            type="password"
            autoComplete="current-password"
            className="order-3 w-full"
            required
          />
          <Link
            href="/passwort-vergessen"
            className="order-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            Passwort vergessen?
          </Link>
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
