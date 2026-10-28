"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormularStatus } from "@/app/(auth)/actions";
import {
  kundenDatensatz,
  kundenPruefen,
  kundenWerteLesen,
  type KundenWerte,
} from "@/lib/kunden/formular";
import { istBestaetigterPartner } from "@/lib/partner/abfragen";
import { EIGENER_KUNDE } from "@/lib/partner/typen";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

export type { KundenWerte };

/**
 * React leert nach jeder abgeschlossenen Formular-Aktion die Eingabefelder.
 * Damit nach einer Fehlermeldung niemand alles neu tippen muss, schicken wir
 * die eingegebenen Werte zurück — das Formular setzt sie wieder ein.
 */
export type KundenStatus = FormularStatus & {
  werte?: KundenWerte;
};

const KEIN_PARTNER =
  "Dieser Vertriebspartner ist nicht mit dir verbunden. Bitte wähle einen bestätigten Partner aus.";

/**
 * Prüft die Auswahl „Kunde eines Vertriebspartners" und liefert den Wert für
 * `source_partner_id`.
 *
 * `bisher` ist die bereits gespeicherte Zuordnung: Sie darf bestehen bleiben,
 * auch wenn die Partnerschaft inzwischen beendet wurde — sonst würde ein
 * einfaches Speichern der Telefonnummer die Herkunft des Kunden löschen.
 */
async function partnerPruefen(
  userId: string,
  auswahl: string,
  bisher: string | null,
): Promise<{ id: string | null } | { fehler: string }> {
  if (!auswahl || auswahl === EIGENER_KUNDE) return { id: null };
  if (auswahl === userId) return { fehler: KEIN_PARTNER };
  if (auswahl === bisher) return { id: auswahl };

  if (!(await istBestaetigterPartner(userId, auswahl))) {
    return { fehler: KEIN_PARTNER };
  }
  return { id: auswahl };
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
  const werte = kundenWerteLesen(formData);

  const fehler = kundenPruefen(werte);
  if (fehler) return { fehler, werte };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const partner = await partnerPruefen(user.id, werte.partner, null);
  if ("fehler" in partner) return { fehler: partner.fehler, werte };

  const { error } = await supabase
    .from("customers")
    .insert({ ...kundenDatensatz(werte, partner.id), owner_id: user.id });

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
  const werte = kundenWerteLesen(formData);
  const id = text(formData, "id");
  if (!id) return { fehler: "Der Kunde konnte nicht zugeordnet werden.", werte };

  const fehler = kundenPruefen(werte);
  if (fehler) return { fehler, werte };

  const { supabase, user } = await angemeldeterNutzer();
  if (!user) return { fehler: NICHT_ANGEMELDET, werte };

  const { data: bisher } = await supabase
    .from("customers")
    .select("source_partner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  const partner = await partnerPruefen(
    user.id,
    werte.partner,
    bisher?.source_partner_id ?? null,
  );
  if ("fehler" in partner) return { fehler: partner.fehler, werte };

  const { error } = await supabase
    .from("customers")
    .update(kundenDatensatz(werte, partner.id))
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
