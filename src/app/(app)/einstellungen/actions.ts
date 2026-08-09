"use server";

import { revalidatePath } from "next/cache";

import type { FormularStatus } from "@/app/(auth)/actions";
import { verbindungTrennen } from "@/lib/kalender";
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

/**
 * Verbindung zum Google-Kalender lösen. Termine, die schon im Kalender stehen,
 * bleiben dort — sie gehören dem Vermittler, nicht dieser Anwendung.
 */
// Ohne Parameter: Das Formular hat keine Felder. React ruft die Aktion zwar
// mit (Status, FormData) auf, beides wird hier aber nicht gebraucht.
export async function googleTrennen(): Promise<FormularStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { fehler: "Du bist nicht mehr angemeldet. Bitte melde dich erneut an." };
  }

  const fehler = await verbindungTrennen(user.id);
  if (fehler) return { fehler: `Trennen fehlgeschlagen: ${fehler}` };

  revalidatePath("/einstellungen");
  return {
    hinweis:
      "Die Verbindung zu Google ist getrennt. Bereits eingetragene Termine bleiben in deinem Kalender stehen.",
  };
}
