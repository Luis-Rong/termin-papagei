import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/** Bereiche, die nur mit Login erreichbar sind. */
const GESCHUETZT = [
  "/dashboard",
  "/termine",
  "/kunden",
  "/partner",
  "/vorlagen",
  "/einstellungen",
];

/** Seiten, die für Angemeldete keinen Sinn ergeben. */
const NUR_ABGEMELDET = ["/login", "/registrieren", "/passwort-vergessen"];

/**
 * In Next.js 16 heißt die frühere „Middleware" jetzt Proxy.
 * Hier wird bei jedem Request die Supabase-Session aufgefrischt und der
 * Zugriff auf geschützte Seiten geprüft.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() prüft die Session serverseitig — auf getSession() darf man sich
  // hier nicht verlassen, da Cookies manipuliert sein könnten.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pfad = request.nextUrl.pathname;

  if (!user && GESCHUETZT.some((p) => pfad === p || pfad.startsWith(`${p}/`))) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/login";
    ziel.searchParams.set("weiter", pfad);
    return NextResponse.redirect(ziel);
  }

  if (user && NUR_ABGEMELDET.includes(pfad)) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/dashboard";
    ziel.search = "";
    return NextResponse.redirect(ziel);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
