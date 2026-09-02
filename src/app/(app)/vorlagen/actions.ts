"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormularStatus } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { istTerminart } from "@/lib/termine/terminarten";
import { istZweck } from "@/lib/vorlagen/typen";

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

export type VorlagenWerte = {
  terminart: string;
  zweck: string;
  betreff: string;
  text: string;
};

export type VorlagenStatus = FormularStatus & {
  werte?: VorlagenWerte;
};

function eingelesen(formData: FormData): VorlagenWerte {
  return {
    terminart: text(formData, "terminart"),
    zweck: text(formData, "zweck"),
    betreff: text(formData, "betreff"),
    text: text(formData, "text"),
  };
}

function pruefe(werte: VorlagenWerte): string | null {
  if (!istTerminart(werte.terminart)) return "Bitte eine Terminart auswählen.";
  if (!istZweck(werte.zweck)) return "Bitte einen Zweck auswählen.";
  if (!werte.betreff) return "Bitte einen Betreff eingeben.";
  if (!werte.text) return "Bitte einen Text eingeben.";
  return null;
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

  const { error } = await supabase.from("templates").insert({
    owner_id: user.id,
    appointment_type: werte.terminart,
    purpose: werte.zweck,
    subject: werte.betreff,
    body: werte.text,
  });

  if (error) return { fehler: `Anlegen fehlgeschlagen: ${error.message}`, werte };

  revalidatePath("/vorlagen");
  redirect("/vorlagen");
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
    .update({
      appointment_type: werte.terminart,
      purpose: werte.zweck,
      subject: werte.betreff,
      body: werte.text,
    })
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
 * Legt von einer Systemvorlage eine eigene Kopie an — Systemvorlagen selbst
 * lassen sich nicht ändern (siehe RLS in 0008_vorlagen.sql), nur als
 * Startpunkt für eine eigene Version verwenden.
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
    .select("appointment_type, purpose, subject, body")
    .eq("id", id)
    .is("owner_id", null)
    .maybeSingle();

  if (!vorlage) return { fehler: "Diese Systemvorlage wurde nicht gefunden." };

  const { data: kopie, error } = await supabase
    .from("templates")
    .insert({ ...vorlage, owner_id: user.id })
    .select("id")
    .single();

  if (error) return { fehler: `Kopieren fehlgeschlagen: ${error.message}` };

  revalidatePath("/vorlagen");
  redirect(`/vorlagen/${kopie.id}`);
}
