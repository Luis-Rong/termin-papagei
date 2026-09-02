import { Mail } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { TERMINART_REIHENFOLGE, TERMINARTEN } from "@/lib/termine/terminarten";
import { vorlagenLaden, type Vorlage } from "@/lib/vorlagen/abfragen";
import { ZWECK_REIHENFOLGE, ZWECKE } from "@/lib/vorlagen/typen";

export const metadata: Metadata = { title: "Vorlagen — Termin Papagei" };

function VorlagenKarte({ vorlage }: { vorlage: Vorlage }) {
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={vorlage.eigene ? "secondary" : "outline"}>
            {ZWECKE[vorlage.zweck]}
          </Badge>
          {!vorlage.eigene && (
            <span className="text-xs text-muted-foreground">Systemvorlage</span>
          )}
        </div>
        <p className="font-heading text-base font-semibold text-primary">
          {vorlage.betreff}
        </p>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {vorlage.text}
        </p>
      </CardContent>
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
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary">
          Vorlagen
        </h1>
        <p className="mt-2 text-muted-foreground">
          Die Bestätigung und beide Erinnerungen — je Terminart eine. Bearbeiten
          und eigene Vorlagen anlegen kommt als Nächstes; hier siehst du erst
          einmal die vorbelegten Systemvorlagen.
        </p>
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
        const zuTerminart = ZWECK_REIHENFOLGE.map((zweck) =>
          vorlagen.find(
            (vorlage) => vorlage.terminart === terminart && vorlage.zweck === zweck,
          ),
        ).filter((vorlage): vorlage is Vorlage => vorlage !== undefined);

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
