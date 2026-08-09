import { ChevronRight, Mail, Phone, Plus, Search, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { partnerName, profileLaden } from "@/lib/partner/abfragen";
import { suchWoerter } from "@/lib/suche";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kunden — Termin Tiger" };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">Kunden</h1>
          <p className="mt-2 text-muted-foreground">
            {kunden?.length === 1
              ? "1 Kunde"
              : `${kunden?.length ?? 0} Kunden`}
            {suche && " gefunden"}
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/kunden/neu">
            <Plus aria-hidden />
            Neuer Kunde
          </Link>
        </Button>
      </div>

      <Form action="/kunden" className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            type="search"
            defaultValue={suche}
            placeholder="Nach Name, E-Mail oder Telefon suchen"
            aria-label="Kunden durchsuchen"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" size="lg">
          Suchen
        </Button>
        {suche && (
          <Button asChild variant="ghost" size="lg">
            <Link href="/kunden">Zurücksetzen</Link>
          </Button>
        )}
      </Form>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">
            Die Kundenliste konnte nicht geladen werden: {error.message}
          </CardContent>
        </Card>
      )}

      {kunden && kunden.length > 0 && (
        <Card className="overflow-hidden py-0">
          <ul className="divide-y">
            {kunden.map((kunde) => {
              const partner = partnerProfile.get(kunde.source_partner_id ?? "");

              return (
                <li key={kunde.id}>
                  <Link
                    href={`/kunden/${kunde.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-lg font-semibold text-primary">
                          {kunde.first_name} {kunde.last_name}
                        </p>
                        {partner && (
                          <Badge variant="secondary">
                            Kunde von {partnerName(partner)}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                        {kunde.email && (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Mail className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{kunde.email}</span>
                          </span>
                        )}
                        {kunde.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3.5 shrink-0" aria-hidden />
                            {kunde.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {kunden && kunden.length === 0 && suche && (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-muted-foreground">
              Kein Kunde passt zu &bdquo;{suche}&ldquo;.
            </p>
            <Button asChild variant="secondary">
              <Link href="/kunden">Suche zurücksetzen</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {kunden && kunden.length === 0 && !suche && (
        <Card className="border-dashed">
          <CardContent className="space-y-4 py-12 text-center">
            <UserPlus className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <div className="space-y-1">
              <p className="font-heading text-xl font-semibold text-primary">
                Noch keine Kunden angelegt
              </p>
              <p className="text-muted-foreground">
                Lege deinen ersten Kunden an — danach lassen sich Termine dafür
                planen.
              </p>
            </div>
            <Button asChild>
              <Link href="/kunden/neu">
                <Plus aria-hidden />
                Ersten Kunden anlegen
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
