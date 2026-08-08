"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormularStatus } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

type Kundendaten = {
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
};

/**
 * Prüft die Formularfelder. Ergebnis ist entweder ein Fehlertext für den
 * Nutzer oder der fertige Datensatz für die Datenbank.
 */
function pruefeEingabe(
  formData: FormData,
): { fehler: string } | { daten: Kundendaten } {
  const vorname = text(formData, "vorname");
  const nachname = text(formData, "nachname");
  const telefon = text(formData, "telefon");
  const email = text(formData, "email");

  if (!vorname || !nachname) {
    return { fehler: "Bitte Vor- und Nachnamen eingeben." };
  }
  if (!telefon && !email) {
    return {
      fehler:
        "Bitte mindestens eine E-Mail-Adresse oder eine Telefonnummer eintragen — ohne Kontaktweg lässt sich später kein Termin verschicken.",
    };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { fehler: "Die E-Mail-Adresse sieht nicht richtig aus." };
  }

  return {
    daten: {
      first_name: vorname,
      last_name: nachname,
      phone: telefon || null,
      email: email || null,
    },
  };
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

export async function kundeAnlegen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const geprueft = pruefeEingabe(formData);
  if ("fehler" in geprueft) return geprueft;

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { error } = await supabase
    .from("customers")
    .insert({ ...geprueft.daten, owner_id: user.id });

  if (error) {
    return { fehler: `Anlegen fehlgeschlagen: ${error.message}` };
  }

  revalidatePath("/kunden");
  revalidatePath("/dashboard");
  redirect("/kunden");
}

export async function kundeSpeichern(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!id) return { fehler: "Der Kunde konnte nicht zugeordnet werden." };

  const geprueft = pruefeEingabe(formData);
  if ("fehler" in geprueft) return geprueft;

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { error } = await supabase
    .from("customers")
    .update(geprueft.daten)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return { fehler: `Speichern fehlgeschlagen: ${error.message}` };
  }

  revalidatePath("/kunden");
  return { hinweis: "Änderungen gespeichert." };
}

export async function kundeLoeschen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!id) return { fehler: "Der Kunde konnte nicht zugeordnet werden." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return { fehler: `Löschen fehlgeschlagen: ${error.message}` };
  }

  revalidatePath("/kunden");
  revalidatePath("/dashboard");
  redirect("/kunden");
}
