import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Es gibt keine Werbeseite — das Werkzeug ist intern. Angemeldete landen auf
 * der Übersicht, alle anderen bei der Anmeldung.
 */
export default async function Start() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
