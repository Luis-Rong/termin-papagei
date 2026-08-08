import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KundeLoeschen } from "@/components/app/kunde-loeschen";
import { KundenFormular } from "@/components/app/kunden-formular";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kunde bearbeiten — Termin Tiger" };

export default async function KundeSeite({ params }: PageProps<"/kunden/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: kunde } = await supabase
    .from("customers")
    .select("id, first_name, last_name, phone, email")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .maybeSingle();

  if (!kunde) {
    notFound();
  }

  const name = `${kunde.first_name} ${kunde.last_name}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/kunden"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Zurück zur Kundenliste
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold text-primary">{name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Kontaktdaten
          </CardTitle>
          <CardDescription>
            Änderungen wirken sich auf alle künftigen E-Mails an diesen Kunden aus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KundenFormular
            kunde={{
              id: kunde.id,
              vorname: kunde.first_name,
              nachname: kunde.last_name,
              telefon: kunde.phone ?? "",
              email: kunde.email ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-destructive">
            Kunde entfernen
          </CardTitle>
          <CardDescription>
            Der Kunde wird endgültig aus deinem Portal gelöscht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KundeLoeschen id={kunde.id} name={name} />
        </CardContent>
      </Card>
    </div>
  );
}
