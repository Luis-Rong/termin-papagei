import { CalendarPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KundeLoeschen } from "@/components/app/kunde-loeschen";
import { kundenName } from "@/lib/kunden/formular";
import {
  KundenFormular,
  type PartnerAuswahl,
} from "@/components/app/kunden-formular";
import { Button } from "@/components/ui/button";
import { Karte, KarteKopf } from "@/components/ui/karte";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import {
  bestaetigtePartner,
  partnerName,
  profileLaden,
} from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kunde · Termin-Papagei" };

export default async function KundeSeite({ params }: PageProps<"/kunden/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: kunde } = await supabase
    .from("customers")
    .select("id, first_name, last_name, phone, email, anrede, anrede_titel, source_partner_id")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .maybeSingle();

  if (!kunde) {
    notFound();
  }

  const name = kundenName(kunde.first_name, kunde.last_name);

  const partner = await bestaetigtePartner(user!.id);
  const partnerAuswahl: PartnerAuswahl[] = partner.map((profil) => ({
    id: profil.id,
    name: partnerName(profil),
  }));

  // Ist die Partnerschaft inzwischen beendet, steht der Partner nicht mehr in
  // der Auswahl. Er wird trotzdem angezeigt, damit ein Speichern die Herkunft
  // des Kunden nicht stillschweigend löscht.
  const ehemaliger = kunde.source_partner_id;
  if (ehemaliger && !partnerAuswahl.some((eintrag) => eintrag.id === ehemaliger)) {
    const profil = (await profileLaden([ehemaliger])).get(ehemaliger);
    if (profil) {
      partnerAuswahl.push({
        id: profil.id,
        name: partnerName(profil),
        beendet: true,
      });
    }
  }

  return (
    <>
      <Seitenkopf
        titel={name}
        kleinzeile="Kunde"
        zurueck={{ href: "/kunden", label: "Kunden" }}
        aktion={
          <Button asChild>
            <Link href={`/termine/neu?kunde=${kunde.id}`}>
              <CalendarPlusIcon aria-hidden />
              Termin anlegen
            </Link>
          </Button>
        }
      />

      <div className="max-w-3xl space-y-8">
        <Karte>
          <KarteKopf titel="Kontaktdaten" />
          <KundenFormular
            kunde={{
              id: kunde.id,
              vorname: kunde.first_name ?? "",
              nachname: kunde.last_name ?? "",
              telefon: kunde.phone ?? "",
              email: kunde.email ?? "",
              anrede: kunde.anrede ?? "du",
              anredeTitel: kunde.anrede_titel ?? "",
              partnerId: kunde.source_partner_id ?? "",
            }}
            partnerAuswahl={partnerAuswahl}
          />
        </Karte>

        <KundeLoeschen id={kunde.id} name={name} />
      </div>
    </>
  );
}
