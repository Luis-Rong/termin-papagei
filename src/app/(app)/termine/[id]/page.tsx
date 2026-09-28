import { ArrowLeft, Building, Monitor, NotebookPen } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ERINNERUNGS_ARTEN,
  erinnerungsPlan,
  type ErinnerungsArt,
} from "@/lib/erinnerungen/plan";
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
import {
  istTerminart,
  ORTE,
  STATUS,
  TERMINARTEN,
  terminartLabel,
} from "@/lib/termine/terminarten";
import {
  absenderName,
  bestaetigungBetreff,
  bestaetigungsStand,
  platzhalterWerte,
} from "@/lib/termine/mail";
import { vorlageLaden } from "@/lib/vorlagen/abfragen";
import {
  dauerInMinuten,
  formatiereDatum,
  formatiereUhrzeit,
  formatiereZeitraum,
  naechsterTerminVorschlag,
  zeitpunktAlsEingabe,
} from "@/lib/zeit";

export const metadata: Metadata = { title: "Termin — Termin Papagei" };

function terminTitel(termin: Termin): string {
  if (termin.kind === "vorbereitung") return "Vorbereitungstermin";
  const art = terminartLabel(termin.terminart ?? "");
  return termin.kunde ? `${art} — ${termin.kunde.name}` : art;
}

function Kennzeichen({ termin }: { termin: Termin }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Badge variant="outline">
        {termin.ort === "digital" ? (
          <Monitor aria-hidden />
        ) : (
          <Building aria-hidden />
        )}
        {ORTE[termin.ort]}
      </Badge>
      {termin.partner && (
        <Badge variant="secondary">mit {termin.partner.name}</Badge>
      )}
      <Badge variant={termin.status === "abgesagt" ? "destructive" : "default"}>
        {STATUS[termin.status]}
      </Badge>
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

  const titel = terminTitel(termin);
  const dauer = dauerInMinuten(termin.beginn, termin.ende);

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
    <div>
      <Link
        href="/termine"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Zurück zur Terminliste
      </Link>
      <h1 className="mt-3 font-heading text-3xl font-bold text-primary">
        {titel}
      </h1>
      <p className="mt-1 text-muted-foreground">
        {formatiereZeitraum(termin.beginn, termin.ende)}
      </p>
      <Kennzeichen termin={termin} />
    </div>
  );

  // Der beteiligte Partner darf den Termin sehen, aber nicht ändern.
  if (!termin.eigener) {
    return (
      <div className="space-y-6">
        {kopf}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl text-primary">
              Termin deines Partners
            </CardTitle>
            <CardDescription>
              Dieser Termin gehört
              {termin.besitzer ? ` ${termin.besitzer.name}` : " einem Partner"}.
              Ändern, verschieben und löschen kann ihn nur die Person, der er
              gehört.
            </CardDescription>
          </CardHeader>
          {termin.notizen && (
            <CardContent>
              <p className="flex gap-2 text-sm">
                <NotebookPen
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="whitespace-pre-wrap">{termin.notizen}</span>
              </p>
            </CardContent>
          )}
        </Card>

        {kalender}
      </div>
    );
  }

  // Ein Vorbereitungstermin hat keinen Kunden und keine Terminart — dafür
  // genügt das kleine Formular mit Zeit und Notizen.
  if (termin.kind === "vorbereitung") {
    return (
      <div className="space-y-6">
        {kopf}

        {termin.parentId && (
          <p className="text-sm text-muted-foreground">
            Gehört zu{" "}
            <Link
              href={`/termine/${termin.parentId}`}
              className="underline underline-offset-4"
            >
              diesem Beratungstermin
            </Link>
            .
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl text-primary">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusWaehlen id={termin.id} status={termin.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl text-primary">
              Termindaten
            </CardTitle>
            <CardDescription>
              Läuft nur in deinem Kalender — der Kunde bekommt dazu nichts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VorbereitungFormular
              termin={{
                id: termin.id,
                beginn: zeitpunktAlsEingabe(termin.beginn),
                dauer,
                notizen: termin.notizen ?? "",
              }}
            />
          </CardContent>
        </Card>

        {kalender}

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-destructive">
              Termin entfernen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TerminLoeschen id={termin.id} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Eigener Kundentermin: volles Formular.
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
            .select("first_name, email")
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
        .select("first_name, last_name, company, email, signature")
        .eq("id", user!.id)
        .maybeSingle(),
      terminart
        ? vorlageLaden(supabase, user!.id, terminart, "bestaetigung")
        : Promise.resolve(null),
      supabase
        .from("email_log")
        .select("purpose, sent_at, termin_beginn")
        .eq("appointment_id", termin.id)
        .in("purpose", ERINNERUNGS_ARTEN)
        .is("error", null),
    ]);

  const kunden: TerminKunde[] = (kundenZeilen ?? []).map((zeile) => ({
    id: zeile.id,
    name: `${zeile.first_name} ${zeile.last_name}`.trim(),
    partnerId: zeile.source_partner_id,
  }));

  const zeigeVorbereitung =
    vorbereitungen.length > 0 ||
    (istTerminart(termin.terminart ?? "") &&
      TERMINARTEN[termin.terminart!].vorbereitungstermin);

  const zeigeMail = terminart !== null && TERMINARTEN[terminart].bestaetigungAnKunden;

  // Betreff und Absender genau so, wie sie beim Versand entstehen.
  const betreff = bestaetigungBetreff(
    vorlage,
    termin.terminart ?? "",
    platzhalterWerte(
      { location: termin.ort, starts_at: termin.beginn },
      { vorname: kundeDaten?.first_name ?? "" },
    ),
  );
  const absender = profil ? absenderName(profil) : "";

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
          erinnerung1TagAktiv: termin.erinnerung1TagAktiv,
          erinnerung1TagStunden: termin.erinnerung1TagStunden,
          erinnerung2StdAktiv: termin.erinnerung2StdAktiv,
          erinnerung2StdStunden: termin.erinnerung2StdStunden,
        },
        verschickt,
        new Date(),
      )
    : null;

  return (
    <div className="space-y-6">
      {kopf}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Status
          </CardTitle>
          <CardDescription>
            Nach dem Termin festhalten, ob er stattgefunden hat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatusWaehlen id={termin.id} status={termin.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Termindaten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TerminFormular
            kunden={kunden}
            partner={partner.map((profil) => ({
              id: profil.id,
              name: partnerName(profil),
            }))}
            beginnVorschlag={naechsterTerminVorschlag()}
            termin={{
              id: termin.id,
              kundeId: termin.kunde?.id ?? "",
              terminart: termin.terminart ?? "",
              ort: termin.ort,
              beginn: zeitpunktAlsEingabe(termin.beginn),
              dauer,
              partnerId: termin.partner?.id ?? OHNE_PARTNER,
              notizen: termin.notizen ?? "",
              erinnerung1TagAktiv: termin.erinnerung1TagAktiv,
              erinnerung1TagStunden: termin.erinnerung1TagStunden,
              erinnerung2StdAktiv: termin.erinnerung2StdAktiv,
              erinnerung2StdStunden: termin.erinnerung2StdStunden,
            }}
          />
        </CardContent>
      </Card>

      {kalender}

      {zeigeMail && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl text-primary">
              E-Mail an den Kunden
            </CardTitle>
            <CardDescription>
              Die Terminbestätigung, genau so wie dein Kunde sie bekommt —
              erstellt aus deiner Vorlage, vor dem Versand noch änderbar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TerminMail
              terminId={termin.id}
              entwurfHtml={termin.bestaetigungEntwurfHtml}
              kundeEmail={kundeDaten?.email ?? null}
              betreff={betreff}
              absender={absender}
              antwortAn={profil?.email ?? ""}
              signaturHtml={profil?.signature ?? null}
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
          </CardContent>
        </Card>
      )}

      {erinnerungen && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl text-primary">
              Automatische Erinnerungen
            </CardTitle>
            <CardDescription>
              Gehen von selbst raus — mit deiner Erinnerungs-Vorlage und
              Signatur. Ein- und ausschalten und den Vorlauf ändern kannst du
              oben bei den Termindaten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErinnerungsUebersicht plan={erinnerungen} />
          </CardContent>
        </Card>
      )}

      {zeigeVorbereitung && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl text-primary">
              Vorbereitungstermine
            </CardTitle>
            <CardDescription>
              Nur für deinen eigenen Kalender — der Kunde bekommt dazu keine
              E-Mail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {vorbereitungen.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {vorbereitungen.map((eintrag) => (
                  <li key={eintrag.id}>
                    <Link
                      href={`/termine/${eintrag.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted"
                    >
                      <span>
                        {formatiereZeitraum(eintrag.beginn, eintrag.ende)}
                      </span>
                      {eintrag.status !== "geplant" && (
                        <Badge
                          variant={
                            eintrag.status === "abgesagt"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {STATUS[eintrag.status]}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <VorbereitungFormular elternId={termin.id} />
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-destructive">
            Termin entfernen
          </CardTitle>
          <CardDescription>
            Der Termin wird endgültig aus deinem Portal gelöscht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TerminLoeschen id={termin.id} />
        </CardContent>
      </Card>
    </div>
  );
}
