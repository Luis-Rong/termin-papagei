import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabasePublishableKey, supabaseUrl } from "./env";

/** Supabase-Client für Server-Komponenten, Server Actions und Route Handler. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // In Server-Komponenten lassen sich keine Cookies setzen — das
          // übernimmt der Proxy (src/proxy.ts), der die Session auffrischt.
        }
      },
    },
  });
}
