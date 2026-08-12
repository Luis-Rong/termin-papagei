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
import { TerminKalender } from "@/components/app/termin-kalender";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verbindungLaden } from "@/lib/kalender";
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
  dauerInMinuten,
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
}: PageProps<"/termine/[id]">) {
  const { id } = await params;

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
  const [{ data: kundenZeilen }, partner, vorbereitungen] = await Promise.all([
    supabase
      .from("customers")
      .select("id, first_name, last_name, source_partner_id")
      .eq("owner_id", user!.id)
      .order("last_name")
      .order("first_name"),
    bestaetigtePartner(user!.id),
    vorbereitungenLaden(user!.id, termin.id),
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
            }}
          />
        </CardContent>
      </Card>

      {kalender}

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
