import type { Metadata } from "next";

import {
  TerminFormular,
  type TerminKunde,
} from "@/components/app/termin-formular";
import { Karte } from "@/components/ui/karte";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import { kundenName } from "@/lib/kunden/formular";
import { bestaetigtePartner, partnerName } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";
import { naechsterTerminVorschlag } from "@/lib/zeit";

export const metadata: Metadata = { title: "Neuer Termin · Termin-Papagei" };

export default async function NeuerTerminSeite({
  searchParams,
}: PageProps<"/termine/neu">) {
  const kundeVorschlag = String((await searchParams).kunde ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: kundenZeilen }, partner, { data: profil }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, first_name, last_name, source_partner_id")
      .eq("owner_id", user!.id)
      .order("last_name")
      .order("first_name"),
    bestaetigtePartner(user!.id),
    supabase.from("profiles").select("nutzen_eigene").eq("id", user!.id).maybeSingle(),
  ]);

  const kunden: TerminKunde[] = (kundenZeilen ?? []).map((zeile) => ({
    id: zeile.id,
    name: kundenName(zeile.first_name, zeile.last_name),
    partnerId: zeile.source_partner_id,
  }));

  // Nur übernehmen, wenn die Id wirklich zu einem eigenen Kunden gehört —
  // sonst könnte ein manipulierter Link einen falschen Kunden vorbelegen.
  const kundeVorbelegt = kunden.some((kunde) => kunde.id === kundeVorschlag)
    ? kundeVorschlag
    : "";

  return (
    <>
      <Seitenkopf
        titel="Neuer Termin"
        kleinzeile="Termine"
        zurueck={{ href: "/termine", label: "Termine" }}
      />

      <Karte className="max-w-3xl">
        <TerminFormular
          kunden={kunden}
          partner={partner.map((profil) => ({
            id: profil.id,
            name: partnerName(profil),
          }))}
          eigeneNutzen={(profil?.nutzen_eigene as string[] | null) ?? []}
          beginnVorschlag={naechsterTerminVorschlag()}
          kundeVorschlag={kundeVorbelegt}
        />
      </Karte>
    </>
  );
}
