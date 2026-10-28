"use client";

import { useActionState, useState } from "react";

import {
  profilSpeichern,
  signaturBildHochladen,
} from "@/app/(app)/einstellungen/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { RichTextEditor } from "@/components/app/rich-text-editor";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Feld } from "@/components/ui/feld";
import { Input } from "@/components/ui/input";

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
  const [geaendert, setGeaendert] = useState(false);

  return (
    <form action={action} className="space-y-6" onChange={() => setGeaendert(true)}>
      <MeldeStatus status={status} />

      <div className="grid gap-6 sm:grid-cols-2">
        <Feld label="Vorname" htmlFor="vorname">
          <Input id="vorname" name="vorname" defaultValue={vorname} required />
        </Feld>
        <Feld label="Nachname" htmlFor="nachname">
          <Input id="nachname" name="nachname" defaultValue={nachname} required />
        </Feld>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Feld label="Firma" htmlFor="firma" optional>
          <Input id="firma" name="firma" defaultValue={firma} />
        </Feld>
        <Feld label="E-Mail-Adresse · Anmeldung" htmlFor="email">
          <Input id="email" value={email} disabled readOnly />
        </Feld>
      </div>

      {/* Sprungziel für „Ändern" unter Vorlagen und Mail-Entwürfen. */}
      <div id="signatur" className="feld scroll-mt-24">
        <span className="feld-beschriftung">E-Mail-Signatur (optional)</span>
        <RichTextEditor
          name="signatur"
          defaultValue={signatur}
          onChange={() => setGeaendert(true)}
          bildUpload={async (datei) => {
            const formData = new FormData();
            formData.set("datei", datei);
            return signaturBildHochladen(formData);
          }}
        />
      </div>

      <Button type="submit" laeuft={laeuft} disabled={!geaendert}>
        {laeuft ? "Wird gespeichert …" : "Änderungen speichern"}
      </Button>
    </form>
  );
}
