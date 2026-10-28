"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState, useState } from "react";

import { vorlageLoeschen } from "@/app/(app)/vorlagen/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Meldung } from "@/components/ui/meldung";

/** Löschen mit Rückfrage — erst der zweite Klick löscht wirklich. */
export function VorlageLoeschen({ id }: { id: string }) {
  const [nachfrage, setNachfrage] = useState(false);
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    vorlageLoeschen,
    {},
  );

  if (!nachfrage) {
    return (
      <div className="space-y-3">
        <MeldeStatus status={status} />
        <Button variante="sekundaer" klein onClick={() => setNachfrage(true)}>
          <Trash2Icon aria-hidden />
          Vorlage löschen
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <MeldeStatus status={status} />
      <input type="hidden" name="id" value={id} />

      <Meldung art="fehler" wort="Löschen?">
        Die Vorlage wird endgültig gelöscht.
      </Meldung>

      <div className="flex flex-wrap gap-4">
        <Button type="submit" klein laeuft={laeuft}>
          {laeuft ? "Wird gelöscht …" : "Ja, endgültig löschen"}
        </Button>
        <Button
          type="button"
          variante="sekundaer"
          klein
          onClick={() => setNachfrage(false)}
          disabled={laeuft}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
