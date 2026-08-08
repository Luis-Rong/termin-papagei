"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type FormularStatus = {
  fehler?: string;
  hinweis?: string;
  /**
   * Zuletzt abgeschickte Eingaben. React leert nach jeder abgeschlossenen
   * Formular-Aktion die Eingabefelder — damit nach einer Fehlermeldung niemand
   * alles neu tippen muss, kommen die Werte hier zurück ins Formular.
   *
   * Passwörter stehen hier bewusst NIE drin: Sie würden sonst im Klartext
   * durch die Server-Antwort und den React-State wandern.
   */
  werte?: Record<string, string>;
};

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** Liest die genannten Felder aus, um sie dem Formular zurückzugeben. */
function werteVon(
  formData: FormData,
  ...felder: string[]
): Record<string, string> {
  return Object.fromEntries(felder.map((feld) => [feld, text(formData, feld)]));
}

async function herkunft(): Promise<string> {
  const kopfzeilen = await headers();
  const host = kopfzeilen.get("host") ?? "localhost:3000";
  const protokoll = host.startsWith("localhost") ? "http" : "https";
  return `${protokoll}://${host}`;
}

/** Übersetzt die englischen Supabase-Meldungen in verständliches Deutsch. */
function uebersetzeFehler(meldung: string): string {
  const m = meldung.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "E-Mail-Adresse oder Passwort ist falsch.";
  }
  if (m.includes("email not confirmed")) {
    return "Bitte bestätige zuerst den Link in der E-Mail, die wir dir geschickt haben.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Für diese E-Mail-Adresse gibt es bereits ein Konto. Melde dich stattdessen an.";
  }
  if (m.includes("password should be at least")) {
    return "Das Passwort ist zu kurz — bitte mindestens 8 Zeichen verwenden.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Zu viele Versuche in kurzer Zeit. Bitte ein paar Minuten warten und erneut versuchen.";
  }
  if (m.includes("fetch failed") || m.includes("enotfound")) {
    return "Keine Verbindung zur Datenbank. Stimmen die Werte in .env.local und läuft das Supabase-Projekt?";
  }
  return meldung;
}

export async function registrieren(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const vorname = text(formData, "vorname");
  const nachname = text(formData, "nachname");
  const firma = text(formData, "firma");
  const email = text(formData, "email");
  const passwort = String(formData.get("passwort") ?? "");
  const einladungscode = text(formData, "einladungscode");

  // Alles außer dem Passwort geht bei einem Fehler zurück ins Formular.
  const werte = werteVon(
    formData,
    "vorname",
    "nachname",
    "firma",
    "email",
    "einladungscode",
  );

  if (!vorname || !nachname || !email || !passwort) {
    return { fehler: "Bitte fülle alle Pflichtfelder aus.", werte };
  }
  if (passwort.length < 8) {
    return { fehler: "Das Passwort muss mindestens 8 Zeichen lang sein.", werte };
  }

  const erwarteterCode = process.env.SIGNUP_INVITE_CODE;
  if (!erwarteterCode) {
    return {
      fehler:
        "Es ist kein Einladungscode hinterlegt. Bitte SIGNUP_INVITE_CODE in .env.local setzen.",
      werte,
    };
  }
  if (einladungscode !== erwarteterCode) {
    return { fehler: "Der Einladungscode stimmt nicht.", werte };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: passwort,
    options: {
      data: { first_name: vorname, last_name: nachname, company: firma },
      emailRedirectTo: `${await herkunft()}/auth/bestaetigen?weiter=/dashboard`,
    },
  });

  if (error) {
    return { fehler: uebersetzeFehler(error.message), werte };
  }

  // Ist die E-Mail-Bestätigung in Supabase aktiv, gibt es noch keine Session.
  if (!data.session) {
    return {
      hinweis:
        "Fast geschafft: Wir haben dir eine E-Mail geschickt. Bitte klicke auf den Bestätigungslink, um dein Konto zu aktivieren.",
    };
  }

  redirect("/dashboard");
}

export async function anmelden(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const email = text(formData, "email");
  const passwort = String(formData.get("passwort") ?? "");
  const weiter = text(formData, "weiter") || "/dashboard";

  // Nach einem Tippfehler im Passwort soll wenigstens die Adresse stehen bleiben.
  const werte = werteVon(formData, "email");

  if (!email || !passwort) {
    return { fehler: "Bitte E-Mail-Adresse und Passwort eingeben.", werte };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: passwort,
  });

  if (error) {
    return { fehler: uebersetzeFehler(error.message), werte };
  }

  revalidatePath("/", "layout");
  redirect(weiter.startsWith("/") ? weiter : "/dashboard");
}

export async function passwortVergessen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const email = text(formData, "email");
  const werte = werteVon(formData, "email");

  if (!email) {
    return { fehler: "Bitte gib deine E-Mail-Adresse ein.", werte };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await herkunft()}/auth/bestaetigen?weiter=/passwort-neu`,
  });

  if (error) {
    return { fehler: uebersetzeFehler(error.message), werte };
  }

  return {
    hinweis:
      "Wenn es ein Konto mit dieser Adresse gibt, ist eine E-Mail mit dem Link zum Zurücksetzen unterwegs.",
  };
}

export async function passwortNeuSetzen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const passwort = String(formData.get("passwort") ?? "");
  const wiederholung = String(formData.get("wiederholung") ?? "");

  if (passwort.length < 8) {
    return { fehler: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }
  if (passwort !== wiederholung) {
    return { fehler: "Die beiden Passwörter stimmen nicht überein." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: passwort });

  if (error) {
    return { fehler: uebersetzeFehler(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function abmelden() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
