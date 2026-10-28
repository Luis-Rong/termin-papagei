import { ChevronRightIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Karte } from "@/components/ui/karte";
import { Liste, Zeile } from "@/components/ui/liste";
import { Meldung } from "@/components/ui/meldung";
import { Schild } from "@/components/ui/schild";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import { kundenName } from "@/lib/kunden/formular";
import { partnerName, profileLaden } from "@/lib/partner/abfragen";
import { suchWoerter } from "@/lib/suche";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kunden · Termin-Papagei" };

export default async function KundenSeite({
  searchParams,
}: PageProps<"/kunden">) {
  const suche = String((await searchParams).q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let abfrage = supabase
    .from("customers")
    .select("id, first_name, last_name, phone, email, source_partner_id")
    .eq("owner_id", user!.id)
    .order("last_name")
    .order("first_name");

  for (const wort of suchWoerter(suche)) {
    const muster = `"%${wort}%"`;
    abfrage = abfrage.or(
      `first_name.ilike.${muster},last_name.ilike.${muster},email.ilike.${muster},phone.ilike.${muster}`,
    );
  }

  const { data: kunden, error } = await abfrage;

  // Namen der Vertriebspartner, über die Kunden gekommen sind.
  const partnerProfile = await profileLaden(
    (kunden ?? []).map((kunde) => kunde.source_partner_id),
  );

  const anzahl = kunden?.length ?? 0;

  return (
    <>
      <Seitenkopf
        titel="Kunden"
        kleinzeile={`${anzahl === 1 ? "1 Kunde" : `${anzahl} Kunden`}${suche ? " gefunden" : ""}`}
        aktion={
          <Button asChild>
            <Link href="/kunden/neu">
              <PlusIcon aria-hidden />
              Neuer Kunde
            </Link>
          </Button>
        }
      />

      <div className="space-y-8">
        <Form action="/kunden" className="relative max-w-md">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-marine-mittel"
            aria-hidden
          />
          <Input
            name="q"
            type="search"
            defaultValue={suche}
            placeholder="Name, E-Mail oder Telefon"
            aria-label="Kunden durchsuchen"
            className="pr-12 pl-12"
          />
          {suche && (
            <Link
              href="/kunden"
              aria-label="Suche zurücksetzen"
              className="knopf knopf-leise knopf-klein knopf-symbol absolute top-1/2 right-1 -translate-y-1/2"
            >
              <XIcon aria-hidden />
            </Link>
          )}
        </Form>

        {error && (
          <Meldung art="fehler">Die Kundenliste konnte nicht geladen werden: {error.message}</Meldung>
        )}

        {kunden && kunden.length > 0 && (
          <Liste>
            {kunden.map((kunde) => {
              const partner = partnerProfile.get(kunde.source_partner_id ?? "");

              return (
                <Zeile key={kunde.id} href={`/kunden/${kunde.id}`}>
                  <div className="grid min-w-0 flex-1 gap-x-6 gap-y-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)] md:items-center">
                    <p className="font-bold text-marine">
                      {kundenName(kunde.first_name, kunde.last_name)}
                    </p>
                    <p className="text-klein break-all text-marine-mittel">{kunde.email ?? "—"}</p>
                    <p className="tabellenziffern text-klein text-marine-mittel">
                      {kunde.phone ?? "—"}
                    </p>
                  </div>
                  {partner && <Schild>von {partnerName(partner)}</Schild>}
                  <ChevronRightIcon className="size-5 shrink-0 text-marine-mittel" aria-hidden />
                </Zeile>
              );
            })}
          </Liste>
        )}

        {kunden && kunden.length === 0 && (
          <Karte className="py-12 text-center text-marine-mittel">
            {suche ? `Kein Kunde passt zu „${suche}“.` : "Noch kein Kunde angelegt."}
          </Karte>
        )}
      </div>
    </>
  );
}
