"use server";

import { revalidatePath } from "next/cache";

import type { FormularStatus } from "@/app/(auth)/actions";
import { BILD_MAX_BYTES } from "@/lib/bild-verkleinern";
import { mailHtmlSaeubern } from "@/lib/html-sicherheit";
import { verbindungTrennen } from "@/lib/kalender";
import { createClient } from "@/lib/supabase/server";

export async function profilSpeichern(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();
  const firma = String(formData.get("firma") ?? "").trim();
  const signaturHtml = mailHtmlSaeubern(String(formData.get("signatur") ?? "").trim());
  // Ein leerer Rich-Text-Editor liefert "<p></p>" statt eines leeren Strings —
  // ohne diese Prüfung stünde nie mehr "kein Signaturblock" in der Mail.
  const signatur = signaturHtml.replace(/<[^>]+>/g, "").trim() ? signaturHtml : "";

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
      signature: signatur || null,
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

/** Erlaubte Bildformate fürs Signatur-Logo — kein SVG, darin ließe sich Skript verstecken. */
const SIGNATUR_BILD_ENDUNGEN: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Der Browser verkleinert vorher (src/lib/bild-verkleinern.ts) — hier nur die Absicherung. */
const SIGNATUR_BILD_MAX_BYTES = BILD_MAX_BYTES;

/**
 * Lädt ein Logo/Banner für die Signatur in den öffentlichen Bucket
 * `signatur-bilder` hoch (siehe 0010_vorlagen_signatur_html.sql) und liefert
 * die öffentliche URL, die der Rich-Text-Editor als `<img>` einfügt.
 */
export async function signaturBildHochladen(
  formData: FormData,
): Promise<{ url: string } | { fehler: string }> {
  const datei = formData.get("datei");
  if (!(datei instanceof File) || datei.size === 0) {
    return { fehler: "Keine Datei erhalten." };
  }

  const endung = SIGNATUR_BILD_ENDUNGEN[datei.type];
  if (!endung) {
    return { fehler: "Bitte eine PNG-, JPG- oder WebP-Datei wählen." };
  }
  if (datei.size > SIGNATUR_BILD_MAX_BYTES) {
    return { fehler: "Das Bild ist auch nach dem Verkleinern noch zu groß. Bitte ein kleineres wählen." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { fehler: "Du bist nicht mehr angemeldet. Bitte melde dich erneut an." };
  }

  const pfad = `${user.id}/${crypto.randomUUID()}.${endung}`;
  const { error } = await supabase.storage
    .from("signatur-bilder")
    .upload(pfad, datei, { contentType: datei.type });

  if (error) return { fehler: `Hochladen fehlgeschlagen: ${error.message}` };

  const { data } = supabase.storage.from("signatur-bilder").getPublicUrl(pfad);
  return { url: data.publicUrl };
}
