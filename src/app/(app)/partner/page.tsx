import { SearchIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  AnfrageBeantworten,
  AnfrageSenden,
  AnfrageZuruecknehmen,
  PartnerschaftBeenden,
} from "@/components/app/partner-aktionen";
import { Input } from "@/components/ui/input";
import { Karte } from "@/components/ui/karte";
import { Liste, Zeile } from "@/components/ui/liste";
import { Meldung } from "@/components/ui/meldung";
import { Schild } from "@/components/ui/schild";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import {
  alsPartnerProfil,
  partnerDatenLaden,
  partnerName,
  PROFIL_FELDER,
} from "@/lib/partner/abfragen";
import type { PartnerProfil } from "@/lib/partner/typen";
import { suchWoerter } from "@/lib/suche";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Partner · Termin-Papagei" };

/** Bei rund 20 Nutzern reicht das für die komplette Liste. */
const MAX_TREFFER = 25;

function Abschnitt({
  titel,
  anzahl,
  children,
}: {
  titel: string;
  anzahl?: number;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 font-serif text-h3 text-marine">
        {titel}
        {anzahl !== undefined && anzahl > 0 && (
          <span className="tabellenziffern ml-3 font-sans text-klein text-marine-mittel">
            {anzahl}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function VermittlerZeile({
  profil,
  aktion,
}: {
  profil: PartnerProfil;
  aktion: ReactNode;
}) {
  return (
    <Zeile className="flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-marine">{partnerName(profil)}</p>
        <p className="text-klein break-words text-marine-mittel">
          {profil.firma ? `${profil.firma} · ` : ""}
          {profil.email}
        </p>
      </div>
      <div className="shrink-0">{aktion}</div>
    </Zeile>
  );
}

export default async function PartnerSeite({
  searchParams,
}: PageProps<"/partner">) {
  const suche = String((await searchParams).q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const daten = await partnerDatenLaden(user!.id);

  // Alle anderen Vermittler — ohne Suchbegriff einfach die ganze (kurze) Liste.
  let abfrage = supabase
    .from("profiles")
    .select(PROFIL_FELDER)
    .neq("id", user!.id)
    .order("last_name")
    .order("first_name")
    .limit(MAX_TREFFER);

  for (const wort of suchWoerter(suche)) {
    const muster = `"%${wort}%"`;
    abfrage = abfrage.or(
      `first_name.ilike.${muster},last_name.ilike.${muster},company.ilike.${muster},email.ilike.${muster}`,
    );
  }

  const { data: gefunden, error } = await abfrage;

  // Zu jedem gefundenen Vermittler die passende Aktion: Wer schon Partner ist,
  // bekommt kein zweites Anfrage-Formular.
  type Beziehung = { art: "partner" | "eingehend" | "ausgehend"; eintragId: string };
  const beziehungen = new Map<string, Beziehung>();
  for (const eintrag of daten.partner) {
    beziehungen.set(eintrag.partner.id, { art: "partner", eintragId: eintrag.id });
  }
  for (const eintrag of daten.eingehend) {
    beziehungen.set(eintrag.partner.id, { art: "eingehend", eintragId: eintrag.id });
  }
  for (const eintrag of daten.ausgehend) {
    beziehungen.set(eintrag.partner.id, { art: "ausgehend", eintragId: eintrag.id });
  }

  return (
    <>
      <Seitenkopf
        titel="Partner"
        kleinzeile={daten.partner.length === 1 ? "1 Partner" : `${daten.partner.length} Partner`}
      />

      <div className="space-y-12">
        {daten.fehler && (
          <Meldung art="fehler">Die Partnerdaten konnten nicht geladen werden: {daten.fehler}</Meldung>
        )}

        {daten.eingehend.length > 0 && (
          <Abschnitt titel="Anfragen an dich" anzahl={daten.eingehend.length}>
            <Liste>
              {daten.eingehend.map((eintrag) => (
                <VermittlerZeile
                  key={eintrag.id}
                  profil={eintrag.partner}
                  aktion={<AnfrageBeantworten id={eintrag.id} />}
                />
              ))}
            </Liste>
          </Abschnitt>
        )}

        <Abschnitt titel="Deine Partner">
          {daten.partner.length > 0 ? (
            <Liste>
              {daten.partner.map((eintrag) => (
                <VermittlerZeile
                  key={eintrag.id}
                  profil={eintrag.partner}
                  aktion={
                    <PartnerschaftBeenden
                      id={eintrag.id}
                      name={partnerName(eintrag.partner)}
                    />
                  }
                />
              ))}
            </Liste>
          ) : (
            <Karte className="py-12 text-center text-marine-mittel">Noch kein Partner.</Karte>
          )}
        </Abschnitt>

        {daten.ausgehend.length > 0 && (
          <Abschnitt titel="Gesendete Anfragen" anzahl={daten.ausgehend.length}>
            <Liste>
              {daten.ausgehend.map((eintrag) => (
                <VermittlerZeile
                  key={eintrag.id}
                  profil={eintrag.partner}
                  aktion={
                    <div className="flex flex-wrap items-center gap-3">
                      <Schild ton="orange">Wartet auf Antwort</Schild>
                      <AnfrageZuruecknehmen id={eintrag.id} />
                    </div>
                  }
                />
              ))}
            </Liste>
          </Abschnitt>
        )}

        <Abschnitt titel="Vermittler finden">
          <div className="space-y-6">
            <Form action="/partner" className="relative max-w-md">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-marine-mittel"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                defaultValue={suche}
                placeholder="Name, Firma oder E-Mail"
                aria-label="Vermittler durchsuchen"
                className="pr-12 pl-12"
              />
              {suche && (
                <Link
                  href="/partner"
                  aria-label="Suche zurücksetzen"
                  className="knopf knopf-leise knopf-klein knopf-symbol absolute top-1/2 right-1 -translate-y-1/2"
                >
                  <XIcon aria-hidden />
                </Link>
              )}
            </Form>

            {error && (
              <Meldung art="fehler">Die Vermittlersuche ist fehlgeschlagen: {error.message}</Meldung>
            )}

            {gefunden && gefunden.length > 0 && (
              <Liste>
                {gefunden.map((zeile) => {
                  const profil = alsPartnerProfil(zeile);
                  const beziehung = beziehungen.get(profil.id);

                  return (
                    <VermittlerZeile
                      key={profil.id}
                      profil={profil}
                      aktion={
                        beziehung?.art === "partner" ? (
                          <Schild ton="gruen">Partner</Schild>
                        ) : beziehung?.art === "eingehend" ? (
                          <AnfrageBeantworten id={beziehung.eintragId} />
                        ) : beziehung?.art === "ausgehend" ? (
                          <Schild ton="orange">Anfrage läuft</Schild>
                        ) : (
                          <AnfrageSenden partnerId={profil.id} />
                        )
                      }
                    />
                  );
                })}
              </Liste>
            )}

            {gefunden && gefunden.length === 0 && (
              <Karte className="py-12 text-center text-marine-mittel">
                {suche
                  ? `Kein Vermittler passt zu „${suche}“.`
                  : "Noch kein weiterer Vermittler registriert."}
              </Karte>
            )}

            {gefunden && gefunden.length === MAX_TREFFER && (
              <p className="text-klein text-marine-mittel">
                Höchstens {MAX_TREFFER} Treffer — fehlt jemand, Suche eingrenzen.
              </p>
            )}
          </div>
        </Abschnitt>
      </div>
    </>
  );
}
