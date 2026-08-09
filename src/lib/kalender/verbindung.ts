import { createClient } from "@/lib/supabase/server";

import { entschluesseln, verschluesseln } from "./verschluesselung";

/**
 * Zugriff auf die Tabelle `google_connections`. Der Token verlässt diese Datei
 * nur entschlüsselt an `index.ts` — und die Anwendung außerhalb von
 * `src/lib/kalender/` sieht ihn nie.
 */

/** Was die Einstellungen-Seite über die Verbindung anzeigen darf. */
export type Kalenderverbindung = {
  googleEmail: string;
  verbundenSeit: string;
};

export async function verbindungLaden(
  userId: string,
): Promise<Kalenderverbindung | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("google_connections")
    .select("google_email, connected_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  return { googleEmail: data.google_email, verbundenSeit: data.connected_at };
}

/** Wirft, wenn der gespeicherte Token nicht entschlüsselt werden kann. */
export async function verbindungMitToken(
  userId: string,
): Promise<{ refreshToken: string; calendarId: string } | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("google_connections")
    .select("refresh_token, calendar_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    refreshToken: entschluesseln(data.refresh_token),
    calendarId: data.calendar_id,
  };
}

/** Legt die Verbindung an oder ersetzt eine bestehende. Gibt eine Fehlermeldung zurück oder null. */
export async function verbindungSpeichern(
  userId: string,
  neu: { refreshToken: string; googleEmail: string; scopes: string },
): Promise<string | null> {
  const supabase = await createClient();

  const { error } = await supabase.from("google_connections").upsert(
    {
      user_id: userId,
      google_email: neu.googleEmail,
      refresh_token: verschluesseln(neu.refreshToken),
      scopes: neu.scopes,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return error ? error.message : null;
}

export async function verbindungLoeschen(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("google_connections")
    .delete()
    .eq("user_id", userId);

  return error ? error.message : null;
}

/**
 * Die Google-Adresse eines bestätigten Partners, damit er als Teilnehmer am
 * gemeinsamen Termin steht. Die Datenbank-Funktion gibt nur die Adresse heraus
 * und nur an einen bestätigten Partner (siehe 0005_google_connections.sql).
 */
export async function partnerGoogleAdresse(
  partnerId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase.rpc("partner_google_adresse", {
    partner: partnerId,
  });

  return typeof data === "string" && data ? data : null;
}
