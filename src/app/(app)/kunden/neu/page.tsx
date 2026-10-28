import type { Metadata } from "next";

import { KundenFormular } from "@/components/app/kunden-formular";
import { Karte } from "@/components/ui/karte";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import { bestaetigtePartner, partnerName } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Neuer Kunde · Termin-Papagei" };

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
    <>
      <Seitenkopf
        titel="Neuer Kunde"
        kleinzeile="Kunden"
        zurueck={{ href: "/kunden", label: "Kunden" }}
      />

      <Karte className="max-w-3xl">
        <KundenFormular partnerAuswahl={partnerAuswahl} />
      </Karte>
    </>
  );
}
