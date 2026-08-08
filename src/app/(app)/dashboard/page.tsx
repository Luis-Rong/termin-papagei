import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard — Termin Tiger" };

export default async function DashboardSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profil }, { count: kundenAnzahl }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user!.id),
  ]);

  const anrede = profil?.first_name ? `Willkommen, ${profil.first_name}` : "Willkommen";
  const hatKunden = (kundenAnzahl ?? 0) > 0;

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
        <Card>
          <CardHeader>
            <CardDescription>Termine diese Woche</CardDescription>
            <CardTitle className="font-heading text-3xl text-primary">–</CardTitle>
          </CardHeader>
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
        <Card>
          <CardHeader>
            <CardDescription>Partner</CardDescription>
            <CardTitle className="font-heading text-3xl text-primary">–</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-secondary bg-secondary/40">
        {hatKunden ? (
          <>
            <CardHeader>
              <CardTitle className="font-heading text-xl text-primary">
                Nächster Schritt: Termine planen
              </CardTitle>
              <CardDescription>
                Deine Kunden sind angelegt. Der Termin-Assistent mit Google
                Kalender und automatischen E-Mails kommt in den nächsten Phasen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href="/kunden">Kunden verwalten</Link>
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
