import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  TerminFormular,
  type TerminKunde,
} from "@/components/app/termin-formular";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { bestaetigtePartner, partnerName } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";
import { naechsterTerminVorschlag } from "@/lib/zeit";

export const metadata: Metadata = { title: "Neuer Termin — Termin Tiger" };

export default async function NeuerTerminSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: kundenZeilen }, partner] = await Promise.all([
    supabase
      .from("customers")
      .select("id, first_name, last_name, source_partner_id")
      .eq("owner_id", user!.id)
      .order("last_name")
      .order("first_name"),
    bestaetigtePartner(user!.id),
  ]);

  const kunden: TerminKunde[] = (kundenZeilen ?? []).map((zeile) => ({
    id: zeile.id,
    name: `${zeile.first_name} ${zeile.last_name}`.trim(),
    partnerId: zeile.source_partner_id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/termine"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Zurück zur Terminliste
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold text-primary">
          Neuer Termin
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Termindaten
          </CardTitle>
          <CardDescription>
            Die Terminart entscheidet, welche E-Mails später automatisch
            rausgehen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TerminFormular
            kunden={kunden}
            partner={partner.map((profil) => ({
              id: profil.id,
              name: partnerName(profil),
            }))}
            beginnVorschlag={naechsterTerminVorschlag()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
