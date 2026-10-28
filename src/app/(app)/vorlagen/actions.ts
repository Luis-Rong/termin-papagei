"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormularStatus } from "@/app/(auth)/actions";
import { mailHtmlSaeubern } from "@/lib/html-sicherheit";
import { createClient } from "@/lib/supabase/server";
import { istAnrede, istVorlagenBereich, istZweck } from "@/lib/vorlagen/typen";

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

export type VorlagenWerte = {
  bereich: string;
  zweck: string;
  anrede: string;
  betreff: string;
  text: string;
};

export type VorlagenStatus = FormularStatus & {
  werte?: VorlagenWerte;
};

function eingelesen(formData: FormData): VorlagenWerte {
  const bereich = text(formData, "bereich");
  return {
    bereich,
    // Sonstige Vorlagen haben keinen Zweck — der Bereich ist der Zweck.
    zweck: bereich === "sonstige" ? "sonstige" : text(formData, "zweck"),
    anrede: text(formData, "anrede") || "du",
    betreff: text(formData, "betreff"),
    text: text(formData, "text"),
  };
}

function pruefe(werte: VorlagenWerte): string | null {
  if (!istVorlagenBereich(werte.bereich)) return "Bitte einen Bereich auswählen.";
  if (!istZweck(werte.zweck)) return "Bitte einen Zweck auswählen.";
  if (werte.bereich !== "sonstige" && werte.zweck === "sonstige") {
    return "Bitte einen Zweck auswählen.";
  }
  if (!istAnrede(werte.anrede)) return "Bitte Du oder Sie wählen.";
  if (!werte.betreff) return "Bitte einen Betreff eingeben.";
  if (!werte.text) return "Bitte einen Text eingeben.";
  return null;
}

function alsDatensatz(werte: VorlagenWerte) {
  return {
    appointment_type: werte.bereich,
    purpose: werte.zweck,
    anrede: werte.anrede,
    subject: werte.betreff,
    body: mailHtmlSaeubern(werte.text),
  };
}

async function angemeldeterNutzer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

const NICHT_ANGEMELDET =
  "Du bist nicht mehr angemeldet. Bitte melde dich erneut an.";

export async function vorlageAnlegen(
  _status: VorlagenStatus,
  formData: FormData,
): Promise<VorlagenStatus> {
  const werte = eingelesen(formData);

  const fehler = pruefe(werte);
  if (fehler) return { fehler, werte };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const { error } = await supabase
    .from("templates")
    .insert({ ...alsDatensatz(werte), owner_id: user.id });

  if (error) return { fehler: `Anlegen fehlgeschlagen: ${error.message}`, werte };

  revalidatePath("/vorlagen");
  redirect(`/vorlagen#${werte.bereich}`);
}

export async function vorlageSpeichern(
  _status: VorlagenStatus,
  formData: FormData,
): Promise<VorlagenStatus> {
  const werte = eingelesen(formData);
  const id = text(formData, "id");
  if (!id) return { fehler: "Die Vorlage konnte nicht zugeordnet werden.", werte };

  const fehler = pruefe(werte);
  if (fehler) return { fehler, werte };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const { error } = await supabase
    .from("templates")
    .update(alsDatensatz(werte))
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}`, werte };

  revalidatePath("/vorlagen");
  return { hinweis: "Änderungen gespeichert.", werte };
}

export async function vorlageLoeschen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!id) return { fehler: "Die Vorlage konnte nicht zugeordnet werden." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { fehler: `Löschen fehlgeschlagen: ${error.message}` };

  revalidatePath("/vorlagen");
  redirect("/vorlagen");
}

/**
 * Legt von einer Vorlage eine eigene Kopie an — von einer Standardvorlage
 * (die selbst nicht änderbar ist, siehe RLS in 0008_vorlagen.sql) oder von
 * einer eigenen. Die Kopie steht danach neben dem Original auf der Übersicht.
 */
export async function vorlageKopieren(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!id) return { fehler: "Die Vorlage konnte nicht zugeordnet werden." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { data: vorlage } = await supabase
    .from("templates")
    .select("appointment_type, purpose, anrede, subject, body")
    .eq("id", id)
    .or(`owner_id.eq.${user.id},owner_id.is.null`)
    .maybeSingle();

  if (!vorlage) return { fehler: "Diese Vorlage wurde nicht gefunden." };

  const { error } = await supabase
    .from("templates")
    .insert({ ...vorlage, owner_id: user.id });

  if (error) return { fehler: `Kopieren fehlgeschlagen: ${error.message}` };

  revalidatePath("/vorlagen");
  return { hinweis: "Kopie angelegt." };
}
