import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VorlageLoeschen } from "@/components/app/vorlage-loeschen";
import { VorlagenFormular } from "@/components/app/vorlagen-formular";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vorlage bearbeiten — Termin Papagei" };

export default async function VorlageSeite({
  params,
}: PageProps<"/vorlagen/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nur eigene Vorlagen sind hier bearbeitbar — Systemvorlagen kommen nur
  // über "Kopieren & bearbeiten" auf der Übersicht hierher.
  const { data: vorlage } = await supabase
    .from("templates")
    .select("id, appointment_type, purpose, subject, body")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .maybeSingle();

  if (!vorlage) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/vorlagen"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Zurück zu den Vorlagen
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold text-primary">
          Vorlage bearbeiten
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Inhalt
          </CardTitle>
          <CardDescription>
            Gehört nur dir — andere Vermittler sehen diese Vorlage nicht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VorlagenFormular
            vorlage={{
              id: vorlage.id,
              terminart: vorlage.appointment_type,
              zweck: vorlage.purpose,
              betreff: vorlage.subject,
              text: vorlage.body,
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-destructive">
            Vorlage entfernen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VorlageLoeschen id={vorlage.id} />
        </CardContent>
      </Card>
    </div>
  );
}
