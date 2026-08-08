"use client";

import { useActionState } from "react";

import { profilSpeichern } from "@/app/(app)/einstellungen/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfilFormular({
  vorname,
  nachname,
  firma,
  email,
}: {
  vorname: string;
  nachname: string;
  firma: string;
  email: string;
}) {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    profilSpeichern,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <MeldeStatus status={status} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vorname">Vorname</Label>
          <Input id="vorname" name="vorname" defaultValue={vorname} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nachname">Nachname</Label>
          <Input id="nachname" name="nachname" defaultValue={nachname} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="firma">
          Firma <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="firma" name="firma" defaultValue={firma} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input id="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Die E-Mail-Adresse ist dein Login und lässt sich hier nicht ändern.
        </p>
      </div>

      <Button type="submit" disabled={laeuft}>
        {laeuft ? "Wird gespeichert …" : "Änderungen speichern"}
      </Button>
    </form>
  );
}
