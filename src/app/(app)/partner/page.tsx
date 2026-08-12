import { Building2, Clock, Mail, Search, UsersRound } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  alsPartnerProfil,
  partnerDatenLaden,
  partnerName,
  PROFIL_FELDER,
} from "@/lib/partner/abfragen";
import type { PartnerProfil } from "@/lib/partner/typen";
import { suchWoerter } from "@/lib/suche";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Partner — Termin Papagei" };

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
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-primary">
        {titel}
        {anzahl !== undefined && anzahl > 0 && <Badge>{anzahl}</Badge>}
      </h2>
      {children}
    </section>
  );
}

function Liste({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-hidden py-0">
      <ul className="divide-y">{children}</ul>
    </Card>
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
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="font-heading text-lg font-semibold text-primary">
          {partnerName(profil)}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {profil.firma && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Building2 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{profil.firma}</span>
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1.5">
            <Mail className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{profil.email}</span>
          </span>
        </div>
      </div>
      <div className="shrink-0">{aktion}</div>
    </li>
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
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary">Partner</h1>
        <p className="mt-2 text-muted-foreground">
          Verbinde dich mit anderen Vertriebspartnern. Bestätigte Partner kannst
          du bei einem Kunden als Vermittler hinterlegen — und später gemeinsame
          Termine in beide Kalender legen.
        </p>
      </div>

      {daten.fehler && (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">
            Die Partnerdaten konnten nicht geladen werden: {daten.fehler}
          </CardContent>
        </Card>
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

      <Abschnitt titel="Deine Partner" anzahl={daten.partner.length}>
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
          <Card className="border-dashed">
            <CardContent className="space-y-3 py-10 text-center">
              <UsersRound
                className="mx-auto size-8 text-muted-foreground"
                aria-hidden
              />
              <p className="text-muted-foreground">
                Noch keine Partner. Suche unten nach Kolleginnen und Kollegen und
                schicke ihnen eine Anfrage.
              </p>
            </CardContent>
          </Card>
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
                    <Badge variant="outline">
                      <Clock aria-hidden />
                      Wartet auf Antwort
                    </Badge>
                    <AnfrageZuruecknehmen id={eintrag.id} />
                  </div>
                }
              />
            ))}
          </Liste>
        </Abschnitt>
      )}

      <Abschnitt titel="Vermittler finden">
        <Form action="/partner" className="flex flex-wrap gap-2">
          <div className="relative min-w-60 flex-1">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              type="search"
              defaultValue={suche}
              placeholder="Nach Name, Firma oder E-Mail suchen"
              aria-label="Vermittler durchsuchen"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="lg">
            Suchen
          </Button>
          {suche && (
            <Button asChild variant="ghost" size="lg">
              <Link href="/partner">Zurücksetzen</Link>
            </Button>
          )}
        </Form>

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="py-6 text-sm text-destructive">
              Die Vermittlersuche ist fehlgeschlagen: {error.message}
            </CardContent>
          </Card>
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
                      <Badge variant="secondary">Partner</Badge>
                    ) : beziehung?.art === "eingehend" ? (
                      <AnfrageBeantworten id={beziehung.eintragId} />
                    ) : beziehung?.art === "ausgehend" ? (
                      <Badge variant="outline">
                        <Clock aria-hidden />
                        Anfrage läuft
                      </Badge>
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
          <Card className="border-dashed">
            <CardContent className="space-y-3 py-10 text-center">
              <p className="text-muted-foreground">
                {suche
                  ? `Kein Vermittler passt zu „${suche}“.`
                  : "Es ist noch kein weiterer Vermittler registriert."}
              </p>
              {suche && (
                <Button asChild variant="secondary">
                  <Link href="/partner">Suche zurücksetzen</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {gefunden && gefunden.length === MAX_TREFFER && (
          <p className="text-sm text-muted-foreground">
            Es werden höchstens {MAX_TREFFER} Vermittler angezeigt — grenze die
            Suche ein, wenn jemand fehlt.
          </p>
        )}
      </Abschnitt>
    </div>
  );
}
