"use client";

import { useActionState } from "react";

import {
  profilSpeichern,
  signaturBildHochladen,
} from "@/app/(app)/einstellungen/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { RichTextEditor } from "@/components/app/rich-text-editor";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfilFormular({
  vorname,
  nachname,
  firma,
  email,
  signatur,
}: {
  vorname: string;
  nachname: string;
  firma: string;
  email: string;
  signatur: string;
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

      {/* Sprungziel für "Signatur ändern" unter Vorlagen und Mail-Entwürfen. */}
      <div id="signatur" className="scroll-mt-24 space-y-2">
        <Label htmlFor="signatur">
          E-Mail-Signatur <span className="text-muted-foreground">(optional)</span>
        </Label>
        <RichTextEditor
          name="signatur"
          defaultValue={signatur}
          bildUpload={async (datei) => {
            const formData = new FormData();
            formData.set("datei", datei);
            return signaturBildHochladen(formData);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Hängt automatisch unter jede Mail, die du an Kunden verschickst. Über
          das Bild-Symbol lässt sich ein Logo oder Banner einfügen — es wird
          automatisch mailtauglich verkleinert. Ein Klick aufs Bild zeigt die
          Größen Klein, Mittel und Groß; feiner geht es durch Ziehen an den
          Ecken.
        </p>
      </div>

      <Button type="submit" disabled={laeuft}>
        {laeuft ? "Wird gespeichert …" : "Änderungen speichern"}
      </Button>
    </form>
  );
}
