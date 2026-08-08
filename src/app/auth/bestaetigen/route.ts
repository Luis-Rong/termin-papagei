import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Zielseite der Links aus Supabase-E-Mails (Konto bestätigen, Passwort
 * zurücksetzen). Löst den Token gegen eine Session ein und leitet weiter.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const typ = searchParams.get("type") as EmailOtpType | null;
  const weiter = searchParams.get("weiter") ?? "/dashboard";

  if (tokenHash && typ) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: typ,
      token_hash: tokenHash,
    });

    if (!error) {
      const ziel = weiter.startsWith("/") ? weiter : "/dashboard";
      return NextResponse.redirect(new URL(ziel, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?fehler=link", origin));
}
