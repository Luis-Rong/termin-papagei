"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { vorlageLoeschen } from "@/app/(app)/vorlagen/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";

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
        <Button variant="destructive" onClick={() => setNachfrage(true)}>
          <Trash2 aria-hidden />
          Vorlage löschen
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <MeldeStatus status={status} />
      <input type="hidden" name="id" value={id} />

      <p className="text-sm">Diese Vorlage wirklich löschen?</p>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="destructive" disabled={laeuft}>
          {laeuft ? "Wird gelöscht …" : "Ja, endgültig löschen"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setNachfrage(false)}
          disabled={laeuft}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
