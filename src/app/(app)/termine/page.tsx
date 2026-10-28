import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TerminZeile } from "@/components/app/termin-zeile";
import { Aufklappen } from "@/components/ui/aufklappen";
import { Button } from "@/components/ui/button";
import { Karte } from "@/components/ui/karte";
import { Liste } from "@/components/ui/liste";
import { Meldung } from "@/components/ui/meldung";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import { StufenLinks } from "@/components/ui/stufen";
import { partnerDatenLaden, partnerName } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";
import {
  aufteilenNachZeit,
  bestaetigungsStaendeLaden,
  nachTagenGruppieren,
  termineLaden,
  type Termin,
} from "@/lib/termine/abfragen";
import { istTerminart, TERMINARTEN, type Terminart } from "@/lib/termine/terminarten";
import { formatiereTag, formatiereWochentag } from "@/lib/zeit";

export const metadata: Metadata = { title: "Termine · Termin-Papagei" };

/**
 * Alles auf einen Blick: Alle Termine, der Beratungsprozess (Erstgespräch,
 * Beratung, Umsetzung) und Service (After-Sales und Service zusammen). Jeder
 * Zähler ist zugleich der Filter — `?art=` trägt den Schlüssel.
 */
const GRUPPEN = {
  prozess: { label: "Beratungsprozess", arten: ["erstgespraech", "beratung", "umsetzung"] },
  betreuung: { label: "Service", arten: ["after_sales", "service"] },
} as const satisfies Record<string, { label: string; arten: readonly Terminart[] }>;

type Gruppe = keyof typeof GRUPPEN;
type Filter = "alle" | Gruppe | Terminart;

function istGruppe(wert: string): wert is Gruppe {
  return wert in GRUPPEN;
}

/** Mehrzahl für die Zähler: „Erstgespräche", „Beratungen" … */
const MEHRZAHL: Record<Terminart, string> = {
  erstgespraech: "Erstgespräche",
  beratung: "Beratungen",
  umsetzung: "Umsetzungen",
  after_sales: "After-Sales",
  service: "Service-Termine",
};

function Zaehler({
  href,
  aktiv,
  zahl,
  wort,
  gross = false,
}: {
  href: string;
  aktiv: boolean;
  zahl: number;
  wort: string;
  gross?: boolean;
}) {
  return (
    <Link
      href={href}
      className={gross ? "zaehler min-w-40" : "zaehler"}
      aria-current={aktiv ? "true" : undefined}
    >
      <span className="zahl">{zahl}</span>
      <span className="wort">{wort}</span>
    </Link>
  );
}

export default async function TermineSeite({
  searchParams,
}: PageProps<"/termine">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [params, { termine, fehler }, partnerDaten] = await Promise.all([
    searchParams,
    termineLaden(user!.id),
    partnerDatenLaden(user!.id),
  ]);

  // Wessen Termine: das ganze Team, nur meine oder die eines Partners.
  const partner = partnerDaten.partner.map((eintrag) => eintrag.partner);
  const werParam = String(params.wer ?? "team");
  const wer =
    werParam === "ich" || partner.some((profil) => profil.id === werParam) ? werParam : "team";

  const artParam = String(params.art ?? "alle");
  const filter: Filter = istGruppe(artParam) || istTerminart(artParam) ? artParam : "alle";
  const gefilterteArten: readonly Terminart[] | null =
    filter === "alle" ? null : istGruppe(filter) ? GRUPPEN[filter].arten : [filter];

  function gehoertDazu(termin: Termin): boolean {
    if (wer === "team") return true;
    if (wer === "ich") return termin.eigener;
    return termin.besitzer?.id === wer || (termin.eigener && termin.partner?.id === wer);
  }

  const { kommende, vergangene } = aufteilenNachZeit(termine.filter(gehoertDazu));
  // Abgesagte zählen nicht als anstehend; in der Liste bleiben sie sichtbar.
  const anstehend = kommende.filter(
    (termin) => termin.kind === "kundentermin" && termin.status !== "abgesagt",
  );
  const anzahl = (arten: readonly Terminart[]) =>
    anstehend.filter((termin) => termin.terminart && arten.includes(termin.terminart)).length;

  const liste = kommende.filter(
    (termin) =>
      gefilterteArten === null ||
      (termin.terminart !== null && gefilterteArten.includes(termin.terminart)),
  );
  const staende = await bestaetigungsStaendeLaden(liste);

  function adresse(aenderung: { wer?: string; art?: Filter }): string {
    const suche = new URLSearchParams();
    const neuWer = aenderung.wer ?? wer;
    const neuArt = aenderung.art ?? filter;
    if (neuWer !== "team") suche.set("wer", neuWer);
    if (neuArt !== "alle") suche.set("art", neuArt);
    const text = suche.toString();
    return text ? `/termine?${text}` : "/termine";
  }

  // Liste nach Tagen gruppiert — „Heute", „Morgen", dann die Wochentage.
  const tage = nachTagenGruppieren(liste);

  // Der Termin ist gelöscht, im Google-Kalender blieb aber etwas stehen. Die
  // Terminseite dazu gibt es nicht mehr, deshalb steht der Hinweis hier.
  const kalenderRest = params.kalender === "rest";

  return (
    <>
      <Seitenkopf
        titel="Termine"
        kleinzeile={
          anstehend.length === 1 ? "1 anstehender Termin" : `${anstehend.length} anstehende Termine`
        }
        aktion={
          <Button asChild>
            <Link href="/termine/neu">
              <PlusIcon aria-hidden />
              Neuer Termin
            </Link>
          </Button>
        }
      >
        {partner.length > 0 && (
          <StufenLinks
            aria-label="Wessen Termine"
            klein
            aktiv={wer}
            optionen={[
              { wert: "team", label: "Komplettes Team", href: adresse({ wer: "team" }) },
              { wert: "ich", label: "Nur meine", href: adresse({ wer: "ich" }) },
              ...partner.map((profil) => ({
                wert: profil.id,
                label: partnerName(profil),
                href: adresse({ wer: profil.id }),
              })),
            ]}
          />
        )}
      </Seitenkopf>

      <div className="space-y-8">
        <div className="flex flex-wrap items-stretch gap-4" role="navigation" aria-label="Zähler">
          <Zaehler
            href={adresse({ art: "alle" })}
            aktiv={filter === "alle"}
            zahl={anstehend.length}
            wort="Alle Termine"
            gross
          />
          {(Object.keys(GRUPPEN) as Gruppe[]).map((gruppe) => (
            <div
              key={gruppe}
              className="flex flex-wrap items-stretch gap-2 rounded-karte border border-sand bg-papier p-2"
            >
              <Zaehler
                href={adresse({ art: gruppe })}
                aktiv={filter === gruppe}
                zahl={anzahl(GRUPPEN[gruppe].arten)}
                wort={GRUPPEN[gruppe].label}
              />
              <span className="w-px self-stretch bg-sand" aria-hidden />
              {GRUPPEN[gruppe].arten.map((terminart) => (
                <Zaehler
                  key={terminart}
                  href={adresse({ art: terminart })}
                  aktiv={filter === terminart}
                  zahl={anzahl([terminart])}
                  wort={MEHRZAHL[terminart]}
                />
              ))}
            </div>
          ))}
        </div>

        {fehler && (
          <Meldung art="fehler">Die Termine konnten nicht geladen werden: {fehler}</Meldung>
        )}

        {kalenderRest && (
          <Meldung art="hinweis">
            Der Termin ist gelöscht, im Google-Kalender steht er noch. Bitte dort
            von Hand löschen.
          </Meldung>
        )}

        {liste.length > 0 ? (
          <div className="space-y-8">
            {tage.map(({ tag, titel, termine: eintraege }) => (
              <section key={tag}>
                <div className="tag-kopf">
                  <span className="tag-name">{titel}</span>
                  <span className="tag-datum">
                    {formatiereWochentag(eintraege[0].beginn)} {formatiereTag(eintraege[0].beginn)}
                  </span>
                </div>
                <Liste>
                  {eintraege.map((termin) => (
                    <TerminZeile key={termin.id} termin={termin} stand={staende.get(termin.id)} />
                  ))}
                </Liste>
              </section>
            ))}
          </div>
        ) : (
          !fehler && (
            <Karte className="py-12 text-center text-marine-mittel">
              {filter === "alle"
                ? "Kein kommender Termin."
                : istGruppe(filter)
                  ? `Kein kommender Termin: ${GRUPPEN[filter].label}.`
                  : `Kein kommender Termin: ${TERMINARTEN[filter].label}.`}
            </Karte>
          )
        )}

        {vergangene.length > 0 && (
          <Aufklappen
            titel={
              vergangene.length === 1
                ? "1 vergangener Termin"
                : `${vergangene.length} vergangene Termine`
            }
          >
            <Liste>
              {vergangene.map((termin) => (
                <TerminZeile key={termin.id} termin={termin} />
              ))}
            </Liste>
          </Aufklappen>
        )}
      </div>
    </>
  );
}
