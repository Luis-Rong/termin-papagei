import { createClient } from "@supabase/supabase-js";

import { supabaseUrl } from "./env";

/**
 * Supabase mit dem geheimen Schlüssel — umgeht Row Level Security.
 *
 * Nur für Abläufe ohne angemeldeten Nutzer, die über alle Vermittler hinweg
 * arbeiten müssen: den Erinnerungs-Job (src/lib/erinnerungen/). Nie in
 * Seiten, Server Actions oder irgendetwas, das ein Nutzer auslösen kann —
 * dort gilt weiterhin `server.ts`, damit RLS greift.
 */
export function createAdminClient() {
  const schluessel = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!schluessel) {
    throw new Error(
      "SUPABASE_SECRET_KEY fehlt in .env.local (Supabase-Dashboard → Settings → API Keys → Secret keys). " +
        "Ohne ihn kann der Erinnerungs-Job nicht laufen.",
    );
  }

  return createClient(supabaseUrl(), schluessel, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
