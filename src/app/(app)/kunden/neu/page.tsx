import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { KundenFormular } from "@/components/app/kunden-formular";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { bestaetigtePartner, partnerName } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Neuer Kunde — Termin Tiger" };

export default async function NeuerKundeSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const partner = await bestaetigtePartner(user!.id);
  const partnerAuswahl = partner.map((profil) => ({
    id: profil.id,
    name: partnerName(profil),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/kunden"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Zurück zur Kundenliste
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold text-primary">
          Neuer Kunde
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Kontaktdaten
          </CardTitle>
          <CardDescription>
            Diese Angaben verwenden wir später für Einladungen und Erinnerungen.
            Unter &bdquo;Herkunft&ldquo; hältst du fest, ob der Kunde über einen
            Vertriebspartner kam.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KundenFormular partnerAuswahl={partnerAuswahl} />
        </CardContent>
      </Card>
    </div>
  );
}
