"use client";

import { CopyIcon } from "lucide-react";
import { useActionState } from "react";

import { vorlageKopieren } from "@/app/(app)/vorlagen/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";

/** Legt eine eigene Kopie der Vorlage an — sie erscheint daneben auf der Übersicht. */
export function VorlageKopieren({ id }: { id: string }) {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    vorlageKopieren,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <MeldeStatus status={status} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variante="sekundaer" klein laeuft={laeuft}>
        <CopyIcon aria-hidden />
        {laeuft ? "Wird kopiert …" : "Kopieren"}
      </Button>
    </form>
  );
}
