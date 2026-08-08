import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PasswortNeuFormular } from "@/components/auth/passwort-formulare";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Neues Passwort — Termin Tiger" };

export default async function PasswortNeuSeite() {
  // Diese Seite erreicht man nur über den Link aus der E-Mail, der eine
  // vorübergehende Session anlegt.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/passwort-vergessen");
  }

  return <PasswortNeuFormular />;
}
