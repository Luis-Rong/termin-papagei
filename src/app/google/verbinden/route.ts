import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import {
  STATE_COOKIE,
  STATE_GUELTIG_SEKUNDEN,
  STATE_PFAD,
} from "@/app/google/state";
import { verbindungStarten } from "@/lib/kalender";
import { createClient } from "@/lib/supabase/server";

/**
 * Startet das Verbinden mit dem Google-Kalender: Der Nutzer wird zu Google
 * geschickt und kommt anschließend bei /google/verbunden wieder heraus.
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const einstellungen = (frage: string) =>
    NextResponse.redirect(new URL(`/einstellungen${frage}`, origin));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?weiter=/einstellungen", origin),
    );
  }

  const state = randomUUID();
  const start = verbindungStarten(origin, state);

  if ("fehler" in start) {
    return einstellungen(
      `?google=fehler&grund=${encodeURIComponent(start.fehler.slice(0, 200))}`,
    );
  }

  const antwort = NextResponse.redirect(start.url);
  antwort.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: STATE_PFAD,
    maxAge: STATE_GUELTIG_SEKUNDEN,
  });

  return antwort;
}
