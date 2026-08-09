import { NextResponse, type NextRequest } from "next/server";

import { STATE_COOKIE, STATE_PFAD } from "@/app/google/state";
import { verbindungAbschliessen } from "@/lib/kalender";
import { createClient } from "@/lib/supabase/server";

/**
 * Rückweg von Google: Hier kommt der einmalige Code an, der gegen den
 * dauerhaften Zugang getauscht wird. Danach geht es zurück in die
 * Einstellungen, wo das Ergebnis angezeigt wird.
 *
 * Diese Adresse muss in der Google Cloud Console als autorisierte
 * Weiterleitungs-URI eingetragen sein — für localhost und für die echte Domain
 * jeweils eigens (Anleitung in der README).
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);

  function zurueck(frage: string) {
    const antwort = NextResponse.redirect(
      new URL(`/einstellungen${frage}`, origin),
    );
    // Der Zufallswert hat seinen Zweck erfüllt, egal wie es ausgegangen ist.
    antwort.cookies.set(STATE_COOKIE, "", { path: STATE_PFAD, maxAge: 0 });
    return antwort;
  }

  function fehler(grund: string) {
    return zurueck(`?google=fehler&grund=${encodeURIComponent(grund.slice(0, 200))}`);
  }

  // "Abbrechen" oder "Kein Zugriff" bei Google ist kein Fehler, sondern eine Entscheidung.
  if (searchParams.get("error")) return zurueck("?google=abgebrochen");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const erwartet = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !erwartet || state !== erwartet) {
    return fehler(
      "Die Antwort von Google ließ sich der Anfrage nicht zuordnen. Bitte noch einmal verbinden.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?weiter=/einstellungen", origin));
  }

  const ergebnis = await verbindungAbschliessen(user.id, code, origin);
  if ("fehler" in ergebnis) return fehler(ergebnis.fehler);

  return zurueck("?google=verbunden");
}
