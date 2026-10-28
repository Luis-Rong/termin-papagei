import type { Metadata } from "next";

import {
  GoogleVerbindung,
  type GoogleRueckmeldung,
} from "@/components/app/google-verbindung";
import { ProfilFormular } from "@/components/app/profil-formular";
import { Karte, KarteKopf } from "@/components/ui/karte";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import { kalenderEingerichtet, verbindungLaden } from "@/lib/kalender";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Einstellungen · Termin-Papagei" };

const ZURUECK_LABEL: Record<string, string> = {
  vorlagen: "Vorlagen",
  termine: "Termin",
  kunden: "Kunden",
  dashboard: "Übersicht",
};

/** Ergebnis des Rücksprungs von Google, siehe src/app/google/verbunden/route.ts. */
function rueckmeldungAus(
  params: Awaited<PageProps<"/einstellungen">["searchParams"]>,
): GoogleRueckmeldung | undefined {
  const art = params.google;
  if (art !== "verbunden" && art !== "abgebrochen" && art !== "fehler") {
    return undefined;
  }

  return {
    art,
    grund: typeof params.grund === "string" ? params.grund : undefined,
  };
}

export default async function EinstellungenSeite({
  searchParams,
}: PageProps<"/einstellungen">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [params, { data: profil }, verbindung] = await Promise.all([
    searchParams,
    supabase
      .from("profiles")
      .select("first_name, last_name, company, signature")
      .eq("id", user!.id)
      .maybeSingle(),
    verbindungLaden(user!.id),
  ]);

  // Kam man von einer anderen Seite („Signatur ändern" unter einer Vorlage),
  // führt ein Knopf dorthin zurück. Nur eigene Pfade, nie fremde Adressen.
  const zurueckPfad = typeof params.zurueck === "string" ? params.zurueck : "";
  const zurueck = /^\/[a-z0-9/_-]*$/i.test(zurueckPfad)
    ? { href: zurueckPfad, label: ZURUECK_LABEL[zurueckPfad.split("/")[1] ?? ""] ?? "Zurück" }
    : undefined;

  return (
    <>
      <Seitenkopf titel="Einstellungen" kleinzeile="Profil und Kalender" zurueck={zurueck} />

      <div className="max-w-3xl space-y-8">
        <Karte>
          <KarteKopf titel="Profil" />
          <ProfilFormular
            vorname={profil?.first_name ?? ""}
            nachname={profil?.last_name ?? ""}
            firma={profil?.company ?? ""}
            email={user?.email ?? ""}
            signatur={profil?.signature ?? ""}
          />
        </Karte>

        <Karte>
          <KarteKopf titel="Google Kalender" />
          <GoogleVerbindung
            verbindung={verbindung}
            eingerichtet={kalenderEingerichtet()}
            rueckmeldung={rueckmeldungAus(params)}
          />
        </Karte>
      </div>
    </>
  );
}
