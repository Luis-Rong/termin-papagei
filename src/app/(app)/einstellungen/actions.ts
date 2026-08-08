"use server";

import { revalidatePath } from "next/cache";

import type { FormularStatus } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

export async function profilSpeichern(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();
  const firma = String(formData.get("firma") ?? "").trim();

  if (!vorname || !nachname) {
    return { fehler: "Vor- und Nachname dürfen nicht leer sein." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { fehler: "Du bist nicht mehr angemeldet. Bitte melde dich erneut an." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: vorname,
      last_name: nachname,
      company: firma || null,
    })
    .eq("id", user.id);

  if (error) {
    return { fehler: `Speichern fehlgeschlagen: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { hinweis: "Profil gespeichert." };
}
