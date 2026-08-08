import { createBrowserClient } from "@supabase/ssr";

import { supabasePublishableKey, supabaseUrl } from "./env";

/** Supabase-Client für Client-Komponenten (läuft im Browser). */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
