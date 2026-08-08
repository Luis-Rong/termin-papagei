import type { Metadata } from "next";

import { ProfilFormular } from "@/components/app/profil-formular";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Einstellungen — Termin Tiger" };

export default async function EinstellungenSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = await supabase
    .from("profiles")
    .select("first_name, last_name, company")
    .eq("id", user!.id)
    .maybeSingle();

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
          />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Google Kalender
          </CardTitle>
          <CardDescription>
            Die Verbindung zu deinem Google-Kalender folgt in Phase 5. Danach landen
            Termine automatisch in deinem Kalender — inklusive Meet-Link.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
