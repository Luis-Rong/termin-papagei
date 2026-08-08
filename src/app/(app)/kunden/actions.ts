"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormularStatus } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** Die Formularfelder so, wie sie im Browser stehen. */
export type KundenWerte = {
  vorname: string;
  nachname: string;
  telefon: string;
  email: string;
};

/**
 * React leert nach jeder abgeschlossenen Formular-Aktion die Eingabefelder.
 * Damit nach einer Fehlermeldung niemand alles neu tippen muss, schicken wir
 * die eingegebenen Werte zurück — das Formular setzt sie wieder ein.
 */
export type KundenStatus = FormularStatus & {
  werte?: KundenWerte;
};

function eingelesen(formData: FormData): KundenWerte {
  return {
    vorname: text(formData, "vorname"),
    nachname: text(formData, "nachname"),
    telefon: text(formData, "telefon"),
    email: text(formData, "email"),
  };
}

/** Gibt einen Fehlertext für den Nutzer zurück — oder null, wenn alles passt. */
function pruefe(werte: KundenWerte): string | null {
  if (!werte.vorname || !werte.nachname) {
    return "Bitte Vor- und Nachnamen eingeben.";
  }
  if (!werte.telefon && !werte.email) {
    return "Bitte mindestens eine E-Mail-Adresse oder eine Telefonnummer eintragen — ohne Kontaktweg lässt sich später kein Termin verschicken.";
  }
  if (werte.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(werte.email)) {
    return "Die E-Mail-Adresse sieht nicht richtig aus.";
  }
  return null;
}

function alsDatensatz(werte: KundenWerte) {
  return {
    first_name: werte.vorname,
    last_name: werte.nachname,
    phone: werte.telefon || null,
    email: werte.email || null,
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
  _status: KundenStatus,
  formData: FormData,
): Promise<KundenStatus> {
  const werte = eingelesen(formData);

  const fehler = pruefe(werte);
  if (fehler) return { fehler, werte };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const { error } = await supabase
    .from("customers")
    .insert({ ...alsDatensatz(werte), owner_id: user.id });

  if (error) {
    return { fehler: `Anlegen fehlgeschlagen: ${error.message}`, werte };
  }

  revalidatePath("/kunden");
  revalidatePath("/dashboard");
  redirect("/kunden");
}

export async function kundeSpeichern(
  _status: KundenStatus,
  formData: FormData,
): Promise<KundenStatus> {
  const werte = eingelesen(formData);
  const id = text(formData, "id");
  if (!id) return { fehler: "Der Kunde konnte nicht zugeordnet werden.", werte };

  const fehler = pruefe(werte);
  if (fehler) return { fehler, werte };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const { error } = await supabase
    .from("customers")
    .update(alsDatensatz(werte))
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return { fehler: `Speichern fehlgeschlagen: ${error.message}`, werte };
  }

  revalidatePath("/kunden");
  return { hinweis: "Änderungen gespeichert.", werte };
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
