"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormularStatus } from "@/app/(auth)/actions";
import { istBestaetigterPartner, istUuid } from "@/lib/partner/abfragen";
import { OHNE_PARTNER } from "@/lib/partner/typen";
import { createClient } from "@/lib/supabase/server";
import {
  istOrt,
  istStatus,
  istTerminart,
  TERMINARTEN,
} from "@/lib/termine/terminarten";
import { eingabeAlsZeitpunkt, plusMinuten } from "@/lib/zeit";

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

function seitenAktualisieren() {
  revalidatePath("/termine");
  revalidatePath("/dashboard");
}

/** Alle Formularfelder zurück ins Formular, damit nichts neu getippt werden muss. */
function werteVon(formData: FormData): Record<string, string> {
  const felder = [
    "kunde",
    "terminart",
    "ort",
    "beginn",
    "dauer",
    "partner",
    "notizen",
    "vorbereitungBeginn",
    "vorbereitungDauer",
  ];
  return Object.fromEntries(felder.map((feld) => [feld, text(formData, feld)]));
}

/** Beginn und Dauer aus dem Formular als echter Zeitraum. */
function zeitraum(
  beginnEingabe: string,
  dauerEingabe: string,
): { beginn: Date; ende: Date } | { fehler: string } {
  const beginn = eingabeAlsZeitpunkt(beginnEingabe);
  if (!beginn) return { fehler: "Bitte Datum und Uhrzeit angeben." };

  const dauer = Number(dauerEingabe);
  if (!Number.isFinite(dauer) || dauer <= 0 || dauer > 24 * 60) {
    return { fehler: "Die Dauer sieht nicht richtig aus." };
  }

  return { beginn, ende: plusMinuten(beginn, dauer) };
}

/**
 * Prüft den beteiligten Vertriebspartner. Der Partner sieht den Termin
 * anschließend in seiner Liste — deshalb muss die Partnerschaft bestätigt sein.
 */
async function partnerPruefen(
  userId: string,
  auswahl: string,
): Promise<{ id: string | null } | { fehler: string }> {
  if (!auswahl || auswahl === OHNE_PARTNER) return { id: null };

  if (!(await istBestaetigterPartner(userId, auswahl))) {
    return {
      fehler:
        "Dieser Vertriebspartner ist nicht mit dir verbunden. Bitte wähle einen bestätigten Partner aus.",
    };
  }
  return { id: auswahl };
}

/** Gemeinsame Prüfung für Anlegen und Speichern eines Kundentermins. */
async function terminPruefen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData,
) {
  const kundeId = text(formData, "kunde");
  const terminart = text(formData, "terminart");
  const ort = text(formData, "ort");

  if (!istUuid(kundeId)) return { fehler: "Bitte einen Kunden auswählen." };
  if (!istTerminart(terminart)) return { fehler: "Bitte eine Terminart auswählen." };
  if (!istOrt(ort)) return { fehler: "Bitte auswählen, ob der Termin im Büro oder digital stattfindet." };

  // Ohne diese Prüfung könnte man per direktem POST einen Termin auf einen
  // fremden Kunden legen — die Termin-Policy prüft nur den Besitzer.
  const { data: kunde } = await supabase
    .from("customers")
    .select("id")
    .eq("id", kundeId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!kunde) return { fehler: "Dieser Kunde gehört nicht zu deinem Portal." };

  const zeit = zeitraum(text(formData, "beginn"), text(formData, "dauer"));
  if ("fehler" in zeit) return { fehler: zeit.fehler };

  const partner = await partnerPruefen(userId, text(formData, "partner"));
  if ("fehler" in partner) return { fehler: partner.fehler };

  return {
    datensatz: {
      kind: "kundentermin" as const,
      customer_id: kundeId,
      appointment_type: terminart,
      location: ort,
      starts_at: zeit.beginn.toISOString(),
      ends_at: zeit.ende.toISOString(),
      notes: text(formData, "notizen") || null,
      partner_id: partner.id,
    },
  };
}

export async function terminAnlegen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const werte = werteVon(formData);

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const geprueft = await terminPruefen(supabase, user.id, formData);
  if ("fehler" in geprueft) return { fehler: geprueft.fehler, werte };

  const { data: termin, error } = await supabase
    .from("appointments")
    .insert({ ...geprueft.datensatz, owner_id: user.id })
    .select("id")
    .single();

  if (error) return { fehler: `Anlegen fehlgeschlagen: ${error.message}`, werte };

  // Bei einer Beratung kann direkt der Vorbereitungstermin mit angelegt werden.
  const vorbereitungBeginn = text(formData, "vorbereitungBeginn");
  if (vorbereitungBeginn) {
    const fehler = await vorbereitungEinfuegen(
      supabase,
      user.id,
      termin.id,
      vorbereitungBeginn,
      text(formData, "vorbereitungDauer"),
      geprueft.datensatz.partner_id,
    );
    if (fehler) {
      // Der Kundentermin steht schon — der Vorbereitungstermin lässt sich auf
      // der Terminseite nachholen, deshalb hier kein Abbruch.
      seitenAktualisieren();
      return {
        fehler: `Der Termin wurde angelegt, aber der Vorbereitungstermin nicht: ${fehler}`,
        werte,
      };
    }
  }

  seitenAktualisieren();
  redirect(`/termine/${termin.id}`);
}

export async function terminSpeichern(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const werte = werteVon(formData);
  const id = text(formData, "id");
  if (!istUuid(id)) {
    return { fehler: "Der Termin konnte nicht zugeordnet werden.", werte };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const geprueft = await terminPruefen(supabase, user.id, formData);
  if ("fehler" in geprueft) return { fehler: geprueft.fehler, werte };

  const { error } = await supabase
    .from("appointments")
    .update(geprueft.datensatz)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}`, werte };

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return { hinweis: "Änderungen gespeichert." };
}

/** Legt einen Vorbereitungstermin an; gibt eine Fehlermeldung zurück oder null. */
async function vorbereitungEinfuegen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  elternId: string,
  beginnEingabe: string,
  dauerEingabe: string,
  partnerId: string | null,
): Promise<string | null> {
  const zeit = zeitraum(
    beginnEingabe,
    dauerEingabe || String(TERMINARTEN.beratung.dauerMinuten),
  );
  if ("fehler" in zeit) return zeit.fehler;

  const { error } = await supabase.from("appointments").insert({
    owner_id: userId,
    kind: "vorbereitung",
    parent_appointment_id: elternId,
    partner_id: partnerId,
    location: "buero",
    starts_at: zeit.beginn.toISOString(),
    ends_at: zeit.ende.toISOString(),
  });

  return error ? error.message : null;
}

/** Vorbereitungstermin nachträglich von der Terminseite aus anlegen. */
export async function vorbereitungAnlegen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const elternId = text(formData, "id");
  if (!istUuid(elternId)) {
    return { fehler: "Der Termin konnte nicht zugeordnet werden." };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  // Nur zum eigenen Termin, und der Partner wird vom Haupttermin übernommen.
  const { data: eltern } = await supabase
    .from("appointments")
    .select("id, partner_id")
    .eq("id", elternId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!eltern) return { fehler: "Dieser Termin gehört nicht zu deinem Portal." };

  const fehler = await vorbereitungEinfuegen(
    supabase,
    user.id,
    elternId,
    text(formData, "beginn"),
    text(formData, "dauer"),
    eltern.partner_id,
  );
  if (fehler) return { fehler: `Anlegen fehlgeschlagen: ${fehler}` };

  seitenAktualisieren();
  revalidatePath(`/termine/${elternId}`);
  return { hinweis: "Vorbereitungstermin angelegt." };
}

/** Vorbereitungstermin verschieben oder mit einer Notiz versehen. */
export async function vorbereitungBearbeiten(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) {
    return { fehler: "Der Termin konnte nicht zugeordnet werden." };
  }

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const zeit = zeitraum(text(formData, "beginn"), text(formData, "dauer"));
  if ("fehler" in zeit) return { fehler: zeit.fehler };

  const { error } = await supabase
    .from("appointments")
    .update({
      starts_at: zeit.beginn.toISOString(),
      ends_at: zeit.ende.toISOString(),
      notes: text(formData, "notizen") || null,
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("kind", "vorbereitung");

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}` };

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return { hinweis: "Änderungen gespeichert." };
}

export async function statusSetzen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  const neuerStatus = text(formData, "status");

  if (!istUuid(id)) return { fehler: "Der Termin konnte nicht zugeordnet werden." };
  if (!istStatus(neuerStatus)) return { fehler: "Unbekannter Status." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  const { error } = await supabase
    .from("appointments")
    .update({ status: neuerStatus })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { fehler: `Speichern fehlgeschlagen: ${error.message}` };

  seitenAktualisieren();
  revalidatePath(`/termine/${id}`);
  return {};
}

export async function terminLoeschen(
  _status: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id");
  if (!istUuid(id)) return { fehler: "Der Termin konnte nicht zugeordnet werden." };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET };

  // Ein Vorbereitungstermin verschwindet über parent_appointment_id automatisch
  // mit, wenn der Kundentermin gelöscht wird (on delete cascade).
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { fehler: `Löschen fehlgeschlagen: ${error.message}` };

  seitenAktualisieren();
  redirect("/termine");
}
