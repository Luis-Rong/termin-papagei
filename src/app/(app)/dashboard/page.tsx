import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { partnerDatenLaden } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";
import {
  anzahlNaechsteTage,
  aufteilenNachZeit,
  termineLaden,
} from "@/lib/termine/abfragen";
import { terminartLabel } from "@/lib/termine/terminarten";
import { formatiereZeitraum } from "@/lib/zeit";

export const metadata: Metadata = { title: "Dashboard — Termin Tiger" };

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

  const anrede = profil?.first_name ? `Willkommen, ${profil.first_name}` : "Willkommen";
  const hatKunden = (kundenAnzahl ?? 0) > 0;
  const offeneAnfragen = partnerDaten.eingehend.length;

  const { kommende } = aufteilenNachZeit(
    termine.filter((termin) => termin.status !== "abgesagt"),
  );
  const naechsterTermin = kommende[0];
  const dieseWoche = anzahlNaechsteTage(kommende, 7);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary">{anrede}</h1>
        <p className="mt-2 text-muted-foreground">
          Dein Portal ist eingerichtet. Die Terminverwaltung entsteht Schritt für
          Schritt — hier siehst du, was als Nächstes kommt.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="transition-colors hover:border-primary/40">
          <Link href="/termine">
            <CardHeader>
              <CardDescription>Termine in 7 Tagen</CardDescription>
              <CardTitle className="font-heading text-3xl text-primary">
                {dieseWoche}
              </CardTitle>
            </CardHeader>
          </Link>
        </Card>
        <Card className="transition-colors hover:border-primary/40">
          <Link href="/kunden">
            <CardHeader>
              <CardDescription>Kunden</CardDescription>
              <CardTitle className="font-heading text-3xl text-primary">
                {kundenAnzahl ?? 0}
              </CardTitle>
            </CardHeader>
          </Link>
        </Card>
        <Card className="transition-colors hover:border-primary/40">
          <Link href="/partner">
            <CardHeader>
              <CardDescription className="flex flex-wrap items-center gap-2">
                Partner
                {offeneAnfragen > 0 && (
                  <Badge>
                    {offeneAnfragen === 1
                      ? "1 offene Anfrage"
                      : `${offeneAnfragen} offene Anfragen`}
                  </Badge>
                )}
              </CardDescription>
              <CardTitle className="font-heading text-3xl text-primary">
                {partnerDaten.partner.length}
              </CardTitle>
            </CardHeader>
          </Link>
        </Card>
      </div>

      <Card className="border-secondary bg-secondary/40">
        {naechsterTermin ? (
          <>
            <CardHeader>
              <CardDescription>Nächster Termin</CardDescription>
              <CardTitle className="font-heading text-xl text-primary">
                {naechsterTermin.kind === "vorbereitung"
                  ? "Vorbereitungstermin"
                  : `${terminartLabel(naechsterTermin.terminart ?? "")}${
                      naechsterTermin.kunde
                        ? ` — ${naechsterTermin.kunde.name}`
                        : ""
                    }`}
              </CardTitle>
              <CardDescription>
                {formatiereZeitraum(naechsterTermin.beginn, naechsterTermin.ende)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href={`/termine/${naechsterTermin.id}`}>
                  Termin ansehen
                </Link>
              </Button>
            </CardContent>
          </>
        ) : hatKunden ? (
          <>
            <CardHeader>
              <CardTitle className="font-heading text-xl text-primary">
                Nächster Schritt: Ersten Termin planen
              </CardTitle>
              <CardDescription>
                Deine Kunden sind angelegt. Terminart und Ort bestimmen, was
                später automatisch an den Kunden rausgeht.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/termine/neu">Termin anlegen</Link>
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="font-heading text-xl text-primary">
                Nächster Schritt: Ersten Kunden anlegen
              </CardTitle>
              <CardDescription>
                Kunden sind die Basis für jeden Termin — Name, E-Mail und
                Telefonnummer genügen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/kunden/neu">Kunde anlegen</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
