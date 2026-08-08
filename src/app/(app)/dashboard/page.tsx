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

  const { data: profil } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", user!.id)
    .maybeSingle();

  const anrede = profil?.first_name ? `Willkommen, ${profil.first_name}` : "Willkommen";

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
        <Card>
          <CardHeader>
            <CardDescription>Kunden</CardDescription>
            <CardTitle className="font-heading text-3xl text-primary">–</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Partner</CardDescription>
            <CardTitle className="font-heading text-3xl text-primary">–</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-secondary bg-secondary/40">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Nächster Schritt: Profil vervollständigen
          </CardTitle>
          <CardDescription>
            Dein Name und deine Firma erscheinen später in der Partnersuche und in
            den E-Mails an deine Kunden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/einstellungen">Profil bearbeiten</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
