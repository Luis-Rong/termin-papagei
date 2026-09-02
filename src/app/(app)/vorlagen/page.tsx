import { Mail, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { VorlageKopieren } from "@/components/app/vorlage-kopieren";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { TERMINART_REIHENFOLGE, TERMINARTEN } from "@/lib/termine/terminarten";
import { vorlagenLaden, type Vorlage } from "@/lib/vorlagen/abfragen";
import { ZWECK_REIHENFOLGE, ZWECKE } from "@/lib/vorlagen/typen";

export const metadata: Metadata = { title: "Vorlagen — Termin Papagei" };

function VorlagenKarte({ vorlage }: { vorlage: Vorlage }) {
  const inhalt = (
    <CardContent className="space-y-2 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={vorlage.eigene ? "secondary" : "outline"}>
          {ZWECKE[vorlage.zweck]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {vorlage.eigene ? "Eigene Vorlage" : "Systemvorlage"}
        </span>
      </div>
      <p className="font-heading text-base font-semibold text-primary">
        {vorlage.betreff}
      </p>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
        {vorlage.text}
      </p>
      {!vorlage.eigene && <VorlageKopieren id={vorlage.id} />}
    </CardContent>
  );

  if (!vorlage.eigene) return <Card>{inhalt}</Card>;

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <Link href={`/vorlagen/${vorlage.id}`}>{inhalt}</Link>
    </Card>
  );
}

export default async function VorlagenSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { vorlagen, fehler } = await vorlagenLaden(user!.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">
            Vorlagen
          </h1>
          <p className="mt-2 text-muted-foreground">
            Die Bestätigung und beide Erinnerungen — je Terminart eine
            Systemvorlage als Startpunkt, plus deine eigenen. Auf eine eigene
            Vorlage klicken zum Bearbeiten; eine Systemvorlage erst kopieren.
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/vorlagen/neu">
            <Plus aria-hidden />
            Neue Vorlage
          </Link>
        </Button>
      </div>

      {fehler && (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">
            Die Vorlagen konnten nicht geladen werden: {fehler}
          </CardContent>
        </Card>
      )}

      {!fehler && vorlagen.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-12 text-center">
            <Mail className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">
              Noch keine Vorlagen hinterlegt.
            </p>
          </CardContent>
        </Card>
      )}

      {TERMINART_REIHENFOLGE.map((terminart) => {
        const zuTerminart = vorlagen
          .filter((vorlage) => vorlage.terminart === terminart)
          .sort(
            (a, b) =>
              ZWECK_REIHENFOLGE.indexOf(a.zweck) -
              ZWECK_REIHENFOLGE.indexOf(b.zweck),
          );

        if (zuTerminart.length === 0) return null;

        return (
          <section key={terminart} className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-primary">
              {TERMINARTEN[terminart].label}
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {zuTerminart.map((vorlage) => (
                <VorlagenKarte key={vorlage.id} vorlage={vorlage} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
