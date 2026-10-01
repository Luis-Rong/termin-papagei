"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { istZusageToken } from "@/lib/termine/zusage";

/**
 * Der Kunde sagt seinen Termin zu. Bewusst ein Klick auf der Seite und nicht
 * schon der Aufruf des Links: Virenscanner und Mailprogramme rufen Links aus
 * Mails automatisch ab — das würde sonst als Zusage zählen.
 */
export async function terminZusagen(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!istZusageToken(token)) return;

  const supabase = await createClient();
  await supabase.rpc("termin_zusagen", { p_token: token });

  revalidatePath(`/zusage/${token}`);
}
