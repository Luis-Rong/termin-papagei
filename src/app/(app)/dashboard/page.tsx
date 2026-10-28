import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TerminZeile } from "@/components/app/termin-zeile";
import { Button } from "@/components/ui/button";
import { Karte } from "@/components/ui/karte";
import { Kennzahl } from "@/components/ui/kennzahl";
import { Liste } from "@/components/ui/liste";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import { partnerDatenLaden } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";
import {
  anzahlNaechsteTage,
  aufteilenNachZeit,
  bestaetigungsStaendeLaden,
  termineLaden,
} from "@/lib/termine/abfragen";
import { heute } from "@/lib/zeit";

export const metadata: Metadata = { title: "Übersicht · Termin-Papagei" };

/** Wie viele der nächsten Termine die Übersicht zeigt. */
const ANZAHL_NAECHSTE = 5;

export default async function DashboardSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profil }, { count: kundenAnzahl }, partnerDaten, { termine }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user!.id)
        .maybeSingle(),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user!.id),
      partnerDatenLaden(user!.id),
      termineLaden(user!.id),
    ]);

  const hatKunden = (kundenAnzahl ?? 0) > 0;
  const offeneAnfragen = partnerDaten.eingehend.length;

  const { kommende } = aufteilenNachZeit(
    termine.filter((termin) => termin.status !== "abgesagt"),
  );
  const naechste = kommende.slice(0, ANZAHL_NAECHSTE);
  const staende = await bestaetigungsStaendeLaden(naechste);
  const dieseWoche = anzahlNaechsteTage(kommende, 7);

  return (
    <>
      <Seitenkopf
        titel={profil?.first_name ? `Hallo ${profil.first_name}` : "Hallo"}
        kleinzeile={heute()}
        aktion={
          <Button asChild>
            <Link href={hatKunden ? "/termine/neu" : "/kunden/neu"}>
              <PlusIcon aria-hidden />
              {hatKunden ? "Neuer Termin" : "Neuer Kunde"}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 sm:grid-cols-3">
        <Kennzahl
          wert={dieseWoche}
          erklaerung="Termine in den nächsten sieben Tagen"
          href="/termine"
        />
        <Kennzahl wert={kundenAnzahl ?? 0} erklaerung="Kunden" href="/kunden" />
        <Kennzahl
          wert={partnerDaten.partner.length}
          erklaerung="Partner"
          href="/partner"
          vergleich={
            offeneAnfragen > 0
              ? offeneAnfragen === 1
                ? "Eine offene Anfrage"
                : `${offeneAnfragen} offene Anfragen`
              : undefined
          }
        />
      </div>

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-serif text-h3 text-marine">Nächste Termine</h2>
          {kommende.length > ANZAHL_NAECHSTE && (
            <Link href="/termine" className="text-klein">
              Alle {kommende.length} Termine
            </Link>
          )}
        </div>

        {naechste.length > 0 ? (
          <Liste>
            {naechste.map((termin) => (
              <TerminZeile
                key={termin.id}
                termin={termin}
                stand={staende.get(termin.id)}
              />
            ))}
          </Liste>
        ) : (
          <Karte className="py-12 text-center text-marine-mittel">
            {hatKunden ? "Kein Termin geplant." : "Noch kein Kunde angelegt."}
          </Karte>
        )}
      </section>
    </>
  );
}
