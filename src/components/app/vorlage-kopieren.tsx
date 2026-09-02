"use client";

import { Copy } from "lucide-react";
import { useActionState } from "react";

import { vorlageKopieren } from "@/app/(app)/vorlagen/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";

/**
 * Systemvorlagen lassen sich nicht direkt ändern — dieser Knopf legt eine
 * eigene Kopie an und führt danach gleich zum Bearbeiten dorthin.
 */
export function VorlageKopieren({ id }: { id: string }) {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    vorlageKopieren,
    {},
  );

  return (
    <form action={action} className="space-y-2">
      <MeldeStatus status={status} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm" disabled={laeuft}>
        <Copy aria-hidden />
        {laeuft ? "Wird kopiert …" : "Kopieren & bearbeiten"}
      </Button>
    </form>
  );
}
