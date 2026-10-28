import { NotebookPenIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  StatusWaehlen,
  TerminLoeschen,
  VorbereitungFormular,
} from "@/components/app/termin-aktionen";
import {
  TerminFormular,
  type TerminKunde,
} from "@/components/app/termin-formular";
import { ErinnerungsUebersicht } from "@/components/app/erinnerungs-uebersicht";
import { TerminKalender } from "@/components/app/termin-kalender";
import { TerminMail, type SofortVersand } from "@/components/app/termin-mail";
import { Aufklappen } from "@/components/ui/aufklappen";
import { Karte, KarteKopf } from "@/components/ui/karte";
import { Liste, Zeile } from "@/components/ui/liste";
import { Schild } from "@/components/ui/schild";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import {
  ERINNERUNGS_ARTEN,
  erinnerungsPlan,
  type ErinnerungsArt,
} from "@/lib/erinnerungen/plan";
import { anfrageHerkunft } from "@/lib/herkunft";
import { verbindungLaden } from "@/lib/kalender";
import { llmEingerichtet } from "@/lib/llm";
import { bestaetigtePartner, partnerName } from "@/lib/partner/abfragen";
import { OHNE_PARTNER } from "@/lib/partner/typen";
import { createClient } from "@/lib/supabase/server";
import {
  terminLaden,
  vorbereitungenLaden,
  type Termin,
} from "@/lib/termine/abfragen";
import { OrtSchild } from "@/components/app/termin-zeile";
import { kundenName } from "@/lib/kunden/formular";
import {
  istTerminart,
  TERMINARTEN,
  terminartLabel,
} from "@/lib/termine/terminarten";
import {
  absenderName,
  beraterName,
  bestaetigungBetreff,
  bestaetigungsStand,
  platzhalterWerte,
} from "@/lib/termine/mail";
import type { Anrede, AnredeTitel } from "@/lib/vorlagen/typen";
import { kundenAktionenHtml, oeffentlicheBasis } from "@/lib/termine/kundenlinks";
import { vorlageLaden } from "@/lib/vorlagen/abfragen";
import {
  dauerInMinuten,
  formatiereDatum,
  formatiereUhrzeit,
  formatiereZeitraum,
  naechsterTerminVorschlag,
  zeitpunktAlsEingabe,
} from "@/lib/zeit";

export const metadata: Metadata = { title: "Termin · Termin-Papagei" };

/** Schilder unter der Überschrift: Ort, Partner, Zusage, Status. */
function Kennzeichen({ termin }: { termin: Termin }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {termin.kind === "kundentermin" && <OrtSchild termin={termin} />}
      {termin.partner && <Schild>mit {termin.partner.name}</Schild>}
      {!termin.eigener && termin.besitzer && (
        <Schild ton="rahmen">Termin von {termin.besitzer.name}</Schild>
      )}
      {termin.kundeZugesagtAm && (
        <Schild ton="gruen">
          Kunde hat zugesagt · {formatiereDatum(termin.kundeZugesagtAm)},{" "}
          {formatiereUhrzeit(termin.kundeZugesagtAm)} Uhr
        </Schild>
      )}
      {!termin.eigener && termin.status === "wahrgenommen" && (
        <Schild ton="gruen">Wahrgenommen</Schild>
      )}
      {!termin.eigener && termin.status === "abgesagt" && (
        <Schild ton="ziegel">Abgesagt</Schild>
      )}
    </div>
  );
}

export default async function TerminSeite({
  params,
  searchParams,
}: PageProps<"/termine/[id]">) {
  const [{ id }, { mail }] = await Promise.all([params, searchParams]);
  // Rückmeldung zum Sofort-Versand aus dem Termin-Wizard.
  const sofortVersand: SofortVersand | undefined =
    mail === "gesendet" || mail === "fehler" ? mail : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const termin = await terminLaden(user!.id, id);
  if (!termin) {
    notFound();
  }

  const dauer = dauerInMinuten(termin.beginn, termin.ende);
  const vorbereitung = termin.kind === "vorbereitung";

  // Nur für eigene Termine relevant: Der Kalender des Partners geht mich nichts an.
  const verbindung = termin.eigener ? await verbindungLaden(user!.id) : null;

  const kalender = (
    <TerminKalender
      terminId={termin.id}
      eigener={termin.eigener}
      digital={termin.ort === "digital"}
      meetLink={termin.meetLink}
      imKalender={Boolean(termin.googleEventId)}
      verbunden={Boolean(verbindung)}
      partnerName={termin.partner?.name}
    />
  );

  const kopf = (
    <Seitenkopf
      kleinzeile={vorbereitung ? "Vorbereitung" : terminartLabel(termin.terminart ?? "")}
      titel={
        vorbereitung
          ? "Vorbereitungstermin"
          : (termin.kunde?.name ?? terminartLabel(termin.terminart ?? ""))
      }
      zurueck={{ href: "/termine", label: "Termine" }}
    >
      <p className="tabellenziffern font-serif text-h4 text-marine">
        {formatiereZeitraum(termin.beginn, termin.ende)}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
        <Kennzeichen termin={termin} />
        {termin.eigener && <StatusWaehlen id={termin.id} status={termin.status} />}
      </div>
    </Seitenkopf>
  );

  // Der beteiligte Partner darf den Termin sehen, aber nicht ändern.
  if (!termin.eigener) {
    return (
      <>
        {kopf}
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Karte>
            <KarteKopf titel="Termin deines Partners" />
            <p className="text-klein text-marine-mittel">
              Nur {termin.besitzer?.name ?? "der Besitzer"} kann ihn ändern.
            </p>
            {termin.notizen && (
              <p className="mt-4 flex gap-3">
                <NotebookPenIcon className="mt-1 size-5 shrink-0 text-marine-mittel" aria-hidden />
                <span className="whitespace-pre-wrap">{termin.notizen}</span>
              </p>
            )}
          </Karte>
          <div>{kalender}</div>
        </div>
      </>
    );
  }

  // Ein Vorbereitungstermin hat keinen Kunden und keine Terminart — dafür
  // genügt das kleine Formular mit Zeit und Notizen.
  if (vorbereitung) {
    return (
      <>
        {kopf}
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Karte>
            <KarteKopf titel="Termindaten" />
            {termin.parentId && (
              <p className="mb-6 text-klein text-marine-mittel">
                Gehört zu{" "}
                <Link href={`/termine/${termin.parentId}`}>diesem Beratungstermin</Link>.
              </p>
            )}
            <VorbereitungFormular
              termin={{
                id: termin.id,
                beginn: zeitpunktAlsEingabe(termin.beginn),
                dauer,
                notizen: termin.notizen ?? "",
              }}
            />
          </Karte>
          <div className="space-y-8">
            {kalender}
            <TerminLoeschen id={termin.id} />
          </div>
        </div>
      </>
    );
  }

  // Eigener Kundentermin: alles.
  const terminart = istTerminart(termin.terminart ?? "") ? termin.terminart! : null;

  const [
    { data: kundenZeilen },
    partner,
    vorbereitungen,
    { data: kundeDaten },
    { data: mailLog },
    { data: profil },
    vorlage,
    { data: erinnerungsLog },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, first_name, last_name, source_partner_id")
      .eq("owner_id", user!.id)
      .order("last_name")
      .order("first_name"),
    bestaetigtePartner(user!.id),
    vorbereitungenLaden(user!.id, termin.id),
    termin.kunde
      ? supabase
          .from("customers")
          .select("first_name, last_name, email, anrede, anrede_titel")
          .eq("id", termin.kunde.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("email_log")
      .select("sent_at")
      .eq("appointment_id", termin.id)
      .eq("purpose", "bestaetigung")
      .is("error", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name, company, email, signature, nutzen_eigene")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("anrede")
      .eq("id", termin.kunde?.id ?? "")
      .maybeSingle()
      .then(({ data }) =>
        terminart
          ? vorlageLaden(
              supabase,
              user!.id,
              terminart,
              "bestaetigung",
              (data?.anrede as Anrede | undefined) ?? "du",
              termin.ort === "telefon",
            )
          : null,
      ),
    supabase
      .from("email_log")
      .select("purpose, sent_at, termin_beginn")
      .eq("appointment_id", termin.id)
      .in("purpose", ERINNERUNGS_ARTEN)
      .is("error", null),
  ]);

  const kunden: TerminKunde[] = (kundenZeilen ?? []).map((zeile) => ({
    id: zeile.id,
    name: kundenName(zeile.first_name, zeile.last_name),
    partnerId: zeile.source_partner_id,
  }));

  const zeigeVorbereitung =
    vorbereitungen.length > 0 ||
    (terminart !== null && TERMINARTEN[terminart].vorbereitungstermin);

  const zeigeMail = terminart !== null && TERMINARTEN[terminart].bestaetigungAnKunden;

  // Betreff und Absender genau so, wie sie beim Versand entstehen.
  const betreff = bestaetigungBetreff(
    vorlage,
    termin.terminart ?? "",
    platzhalterWerte(
      {
        location: termin.ort,
        starts_at: termin.beginn,
        ort_strasse: termin.ortStrasse,
        ort_plz_ort: termin.ortPlzOrt,
      },
      {
        vorname: kundeDaten?.first_name ?? "",
        nachname: kundeDaten?.last_name ?? "",
        anrede: (kundeDaten?.anrede as Anrede | undefined) ?? "du",
        anredeTitel: (kundeDaten?.anrede_titel as AnredeTitel | null | undefined) ?? null,
      },
      profil ? beraterName(profil) : "",
    ),
    termin.nutzen,
  );
  const absender = profil ? absenderName(profil) : "";

  // Dieselben Knöpfe, die beim Versand in die Mail kommen.
  const kundenBasis = oeffentlicheBasis(await anfrageHerkunft());
  const aktionenHtml = kundenAktionenHtml(
    {
      terminart: termin.terminart ?? "",
      ort: termin.ort,
      adresse: termin.ortAdresse,
      beginn: termin.beginn,
      ende: termin.ende,
      meetLink: termin.meetLink,
      vermittler: [profil?.first_name, profil?.last_name].filter(Boolean).join(" "),
      firma: profil?.company ?? null,
    },
    termin.zusageToken,
    kundenBasis,
    Boolean(termin.kundeZugesagtAm),
  );

  // Nur was für den aktuellen Beginn rausging, zählt — nach einer
  // Verschiebung plant der Job die Erinnerungen neu (wie in src/lib/erinnerungen).
  const verschickt: Partial<Record<ErinnerungsArt, string>> = {};
  for (const eintrag of erinnerungsLog ?? []) {
    if (
      eintrag.termin_beginn &&
      new Date(eintrag.termin_beginn).getTime() === new Date(termin.beginn).getTime()
    ) {
      verschickt[eintrag.purpose as ErinnerungsArt] = eintrag.sent_at;
    }
  }
  const erinnerungen = terminart
    ? erinnerungsPlan(
        {
          terminart,
          status: termin.status,
          beginn: termin.beginn,
          angelegtAm: termin.angelegtAm,
          kundeHatEmail: Boolean(kundeDaten?.email?.trim()),
          erinnerungen: termin.erinnerungen,
        },
        verschickt,
        new Date(),
      )
    : null;

  return (
    <>
      {kopf}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          {zeigeMail && (
            <Karte>
              <KarteKopf titel="E-Mail an den Kunden" />
              <TerminMail
                terminId={termin.id}
                entwurfHtml={termin.bestaetigungEntwurfHtml}
                kundeEmail={kundeDaten?.email ?? null}
                betreff={betreff}
                absender={absender}
                antwortAn={profil?.email ?? ""}
                signaturHtml={profil?.signature ?? null}
                aktionenHtml={aktionenHtml}
                zusageLinkFehlt={kundenBasis === null}
                notizen={termin.notizen}
                kiVerfuegbar={llmEingerichtet()}
                verschicktAm={
                  mailLog
                    ? `${formatiereDatum(mailLog.sent_at)}, ${formatiereUhrzeit(mailLog.sent_at)} Uhr`
                    : null
                }
                stand={bestaetigungsStand(
                  Boolean(termin.bestaetigungEntwurfHtml),
                  termin.bestaetigungEntwurfAm,
                  mailLog?.sent_at ?? null,
                )}
                sofortVersand={sofortVersand}
              />
            </Karte>
          )}

          <Karte>
            <KarteKopf titel="Termindaten" />
            <TerminFormular
              kunden={kunden}
              partner={partner.map((profil) => ({
                id: profil.id,
                name: partnerName(profil),
              }))}
              eigeneNutzen={(profil?.nutzen_eigene as string[] | null) ?? []}
              beginnVorschlag={naechsterTerminVorschlag()}
              termin={{
                id: termin.id,
                kundeId: termin.kunde?.id ?? "",
                terminart: termin.terminart ?? "",
                ort: termin.ort,
                ortStrasse: termin.ortStrasse ?? "",
                ortPlzOrt: termin.ortPlzOrt ?? "",
                nutzen: termin.nutzen,
                beginn: zeitpunktAlsEingabe(termin.beginn),
                dauer,
                partnerId: termin.partner?.id ?? OHNE_PARTNER,
                notizen: termin.notizen ?? "",
                erinnerungen: termin.erinnerungen,
              }}
            />
          </Karte>
        </div>

        <div className="space-y-8">
          {kalender}

          {erinnerungen && (
            <Karte>
              <KarteKopf titel="Erinnerungen" />
              <ErinnerungsUebersicht plan={erinnerungen} />
            </Karte>
          )}

          {zeigeVorbereitung && (
            <Karte>
              <KarteKopf titel="Vorbereitung" />
              {vorbereitungen.length > 0 && (
                <Liste className="mb-4">
                  {vorbereitungen.map((eintrag) => (
                    <Zeile key={eintrag.id} href={`/termine/${eintrag.id}`} className="px-4 py-3 text-klein">
                      <span className="tabellenziffern min-w-0 flex-1">
                        {formatiereZeitraum(eintrag.beginn, eintrag.ende)}
                      </span>
                      {eintrag.status === "wahrgenommen" && <Schild ton="gruen">Wahrgenommen</Schild>}
                      {eintrag.status === "abgesagt" && <Schild ton="ziegel">Abgesagt</Schild>}
                    </Zeile>
                  ))}
                </Liste>
              )}
              <Aufklappen titel="Vorbereitungstermin anlegen">
                <VorbereitungFormular elternId={termin.id} />
              </Aufklappen>
            </Karte>
          )}

          <TerminLoeschen id={termin.id} />
        </div>
      </div>
    </>
  );
}
