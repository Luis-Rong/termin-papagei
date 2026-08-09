"use server";

import { revalidatePath } from "next/cache";

import type { FormularStatus } from "@/app/(auth)/actions";
import { istUuid } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/**
 * Server Actions sind auch per direktem POST erreichbar — deshalb wird in jeder
 * Aktion erneut geprüft, wer angemeldet ist. Zusätzlich schützt die Row Level
 * Security in Supabase fremde Datensätze.
 */
async function angemeldeterNutzer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

const NICHT_ANGEMELDET =
  "Du bist nicht mehr angemeldet. Bitte melde dich erneut an.";

/** Nach jeder Änderung: Partnerseite, Kundenauswahl und Dashboard-Kachel. */
function seitenAktualisieren() {
  revalidatePath("/partner");
  revalidatePath("/kunden");
  revalidatePath("/dashboard");
}

export async function anfrageSenden(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const partnerId = text(formData, "partnerId");
  if (!istUuid(partnerId)) {
    return { fehler: "Der Vermittler konnte nicht zugeordnet werden." };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  if (partnerId === user.id) {
    return { fehler: "Du kannst dich nicht selbst als Partner anfragen." };
  }

  const { error } = await supabase
    .from("partnerships")
    .insert({ requester_id: user.id, addressee_id: partnerId, status: "pending" });

  if (error) {
    // 23505 = der eindeutige Index über das Paar hat zugeschlagen: Es gibt
    // bereits eine Anfrage in einer der beiden Richtungen.
    if (error.code === "23505") {
      return {
        fehler:
          "Mit diesem Vermittler besteht bereits eine Anfrage oder eine Partnerschaft.",
      };
    }
    return { fehler: `Anfrage fehlgeschlagen: ${error.message}` };
  }

  seitenAktualisieren();
  return {};
}

export async function anfrageAnnehmen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) {
    return { fehler: "Die Anfrage konnte nicht zugeordnet werden." };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  // Annehmen darf nur der Angefragte — und nur, solange die Anfrage offen ist.
  const { data, error } = await supabase
    .from("partnerships")
    .update({ status: "accepted" })
    .eq("id", id)
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return { fehler: `Annehmen fehlgeschlagen: ${error.message}` };
  if (!data) {
    return { fehler: "Diese Anfrage gibt es nicht mehr." };
  }

  seitenAktualisieren();
  return {};
}

/**
 * Ablehnen, Zurücknehmen und Beenden sind derselbe Vorgang: Der Eintrag wird
 * gelöscht. Dadurch kann man es später neu versuchen, ohne dass eine alte
 * Absage im Weg steht.
 */
async function eintragLoeschen(formData: FormData): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) {
    return { fehler: "Der Eintrag konnte nicht zugeordnet werden." };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { error } = await supabase
    .from("partnerships")
    .delete()
    .eq("id", id)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) return { fehler: `Vorgang fehlgeschlagen: ${error.message}` };

  seitenAktualisieren();
  return {};
}

export async function anfrageAblehnen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  return eintragLoeschen(formData);
}

export async function anfrageZuruecknehmen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  return eintragLoeschen(formData);
}

export async function partnerschaftBeenden(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  return eintragLoeschen(formData);
}
