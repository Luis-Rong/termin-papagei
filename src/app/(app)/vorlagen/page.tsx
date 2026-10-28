import { BellIcon, PencilIcon, PlusIcon, SendIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { VorlageKopieren } from "@/components/app/vorlage-kopieren";
import { Aufklappen } from "@/components/ui/aufklappen";
import { Button } from "@/components/ui/button";
import { Karte } from "@/components/ui/karte";
import { Meldung } from "@/components/ui/meldung";
import { Schild } from "@/components/ui/schild";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { vorlagenLaden, type Vorlage } from "@/lib/vorlagen/abfragen";
import {
  ANREDEN,
  VORLAGEN_BEREICH_REIHENFOLGE,
  VORLAGEN_BEREICHE,
  ZWECK_REIHENFOLGE,
  ZWECKE,
  type Anrede,
  type Zweck,
} from "@/lib/vorlagen/typen";

export const metadata: Metadata = { title: "Vorlagen · Termin-Papagei" };

/** Der Vorlagentext als Klartext mit Absätzen — vollständig, nichts abgeschnitten. */
function klartext(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-3]|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Bestätigung auf Marine mit Brief, Erinnerungen auf Orange-Fläche mit Glocke. */
function ZweckSchild({ zweck }: { zweck: Zweck }) {
  if (zweck === "bestaetigung") {
    return (
      <Schild className="schild-bestaetigung" icon={<SendIcon aria-hidden />}>
        {ZWECKE[zweck]}
      </Schild>
    );
  }
  if (zweck === "sonstige") {
    return <Schild ton="rahmen">{ZWECKE[zweck]}</Schild>;
  }
  return (
    <Schild className="schild-erinnerung" icon={<BellIcon aria-hidden />}>
      {ZWECKE[zweck]}
    </Schild>
  );
}

function VorlagenKarte({ vorlage }: { vorlage: Vorlage }) {
  return (
    <Karte className={cn("flex flex-col gap-4", vorlage.eigene && "karte-eigene")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ZweckSchild zweck={vorlage.zweck} />
        {vorlage.eigene ? (
          <Schild className="schild-eigene" icon={<PencilIcon aria-hidden />}>
            Eigene
          </Schild>
        ) : (
          <Schild ton="rahmen">Standard</Schild>
        )}
      </div>

      <p className="font-bold text-marine">{vorlage.betreff}</p>

      <Aufklappen titel="Text">
        <p className="text-klein whitespace-pre-line text-marine-mittel">
          {klartext(vorlage.text)}
        </p>
      </Aufklappen>

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
        {vorlage.eigene && (
          <Button asChild variante="sekundaer" klein>
            <Link href={`/vorlagen/${vorlage.id}`}>
              <PencilIcon aria-hidden />
              Bearbeiten
            </Link>
          </Button>
        )}
        <VorlageKopieren id={vorlage.id} />
      </div>
    </Karte>
  );
}

function nachZweck(a: Vorlage, b: Vorlage): number {
  const reihenfolge = [...ZWECK_REIHENFOLGE, "sonstige"] as string[];
  return reihenfolge.indexOf(a.zweck) - reihenfolge.indexOf(b.zweck);
}

export default async function VorlagenSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { vorlagen, fehler } = await vorlagenLaden(user!.id);
  const eigene = vorlagen.filter((vorlage) => vorlage.eigene).length;

  return (
    <>
      <Seitenkopf
        titel="Vorlagen"
        kleinzeile={eigene === 1 ? "1 eigene Vorlage" : `${eigene} eigene Vorlagen`}
        aktion={
          <Button asChild>
            <Link href="/vorlagen/neu">
              <PlusIcon aria-hidden />
              Neue Vorlage
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        {fehler && (
          <Meldung art="fehler">Die Vorlagen konnten nicht geladen werden: {fehler}</Meldung>
        )}

        {VORLAGEN_BEREICH_REIHENFOLGE.map((bereich) => {
          const zuBereich = vorlagen.filter((vorlage) => vorlage.bereich === bereich);
          const eigeneHier = zuBereich.filter((vorlage) => vorlage.eigene).length;

          return (
            <Aufklappen
              key={bereich}
              id={bereich}
              className="karte py-0"
              titel={
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-serif text-h3 font-medium">{VORLAGEN_BEREICHE[bereich]}</span>
                  <span className="tabellenziffern font-sans text-klein font-normal text-marine-mittel">
                    {zuBereich.length === 1 ? "1 Vorlage" : `${zuBereich.length} Vorlagen`}
                    {eigeneHier > 0 && ` · ${eigeneHier} eigene`}
                  </span>
                </span>
              }
            >
              <div className="space-y-8 pb-6">
                {bereich === "sonstige" ? (
                  zuBereich.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-3">
                      {zuBereich.map((vorlage) => (
                        <VorlagenKarte key={vorlage.id} vorlage={vorlage} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-marine-mittel">Noch keine eigene Vorlage.</p>
                  )
                ) : (
                  (Object.keys(ANREDEN) as Anrede[]).map((anrede) => {
                    const zuAnrede = zuBereich
                      .filter((vorlage) => vorlage.anrede === anrede)
                      .sort(nachZweck);
                    if (zuAnrede.length === 0) return null;
                    return (
                      <div key={anrede}>
                        <p className="marke mb-3 text-marine-mittel">{ANREDEN[anrede]}</p>
                        <div className="grid gap-6 md:grid-cols-3">
                          {zuAnrede.map((vorlage) => (
                            <VorlagenKarte key={vorlage.id} vorlage={vorlage} />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
                {bereich === "sonstige" && (
                  <Button asChild variante="sekundaer" klein>
                    <Link href="/vorlagen/neu?bereich=sonstige">
                      <PlusIcon aria-hidden />
                      Neue Vorlage
                    </Link>
                  </Button>
                )}
              </div>
            </Aufklappen>
          );
        })}
      </div>
    </>
  );
}
