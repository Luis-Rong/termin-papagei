import type { Metadata } from "next";

import {
  GoogleVerbindung,
  type GoogleRueckmeldung,
} from "@/components/app/google-verbindung";
import { ProfilFormular } from "@/components/app/profil-formular";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { kalenderEingerichtet, verbindungLaden } from "@/lib/kalender";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Einstellungen — Termin Papagei" };

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary">
          Einstellungen
        </h1>
        <p className="mt-2 text-muted-foreground">
          Deine Angaben erscheinen in der Partnersuche und in den E-Mails an deine
          Kunden.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">Profil</CardTitle>
          <CardDescription>Name und Firma deines Portals.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfilFormular
            vorname={profil?.first_name ?? ""}
            nachname={profil?.last_name ?? ""}
            firma={profil?.company ?? ""}
            email={user?.email ?? ""}
            signatur={profil?.signature ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Google Kalender
          </CardTitle>
          <CardDescription>
            Freiwillig: Ist der Kalender verbunden, landen deine Termine
            automatisch darin und digitale Termine bekommen einen Meet-Link.
            Ohne Verbindung funktioniert alles andere unverändert — du trägst
            Termine dann selbst in deinen Kalender ein. Ein Google-Konto genügt,
            eine @gmail.com-Adresse ist nicht nötig.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleVerbindung
            verbindung={verbindung}
            eingerichtet={kalenderEingerichtet()}
            rueckmeldung={rueckmeldungAus(params)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
