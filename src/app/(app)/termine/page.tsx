import {
  Building,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Monitor,
  Plus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  aufteilenNachZeit,
  termineLaden,
  type Termin,
} from "@/lib/termine/abfragen";
import { ORTE, STATUS, terminartLabel } from "@/lib/termine/terminarten";
import { formatiereZeitraum } from "@/lib/zeit";

export const metadata: Metadata = { title: "Termine — Termin Tiger" };

function Abschnitt({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl font-semibold text-primary">{titel}</h2>
      {children}
    </section>
  );
}

function TerminZeile({ termin }: { termin: Termin }) {
  const titel =
    termin.kind === "vorbereitung"
      ? "Vorbereitung"
      : `${terminartLabel(termin.terminart ?? "")}${termin.kunde ? ` — ${termin.kunde.name}` : ""}`;

  return (
    <li>
      <Link
        href={`/termine/${termin.id}`}
        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {formatiereZeitraum(termin.beginn, termin.ende)}
          </p>
          <p className="mt-0.5 font-heading text-lg font-semibold text-primary">
            {titel}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
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
            {!termin.eigener && termin.besitzer && (
              <Badge variant="outline">Termin von {termin.besitzer.name}</Badge>
            )}
            {termin.status !== "geplant" && (
              <Badge
                variant={termin.status === "abgesagt" ? "destructive" : "default"}
              >
                {STATUS[termin.status]}
              </Badge>
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
}

function Liste({ termine }: { termine: Termin[] }) {
  return (
    <Card className="overflow-hidden py-0">
      <ul className="divide-y">
        {termine.map((termin) => (
          <TerminZeile key={termin.id} termin={termin} />
        ))}
      </ul>
    </Card>
  );
}

export default async function TermineSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { termine, fehler } = await termineLaden(user!.id);
  const { kommende, vergangene } = aufteilenNachZeit(termine);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">Termine</h1>
          <p className="mt-2 text-muted-foreground">
            {kommende.length === 1
              ? "1 kommender Termin"
              : `${kommende.length} kommende Termine`}
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/termine/neu">
            <Plus aria-hidden />
            Neuer Termin
          </Link>
        </Button>
      </div>

      {fehler && (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">
            Die Termine konnten nicht geladen werden: {fehler}
          </CardContent>
        </Card>
      )}

      {termine.length === 0 && !fehler && (
        <Card className="border-dashed">
          <CardContent className="space-y-4 py-12 text-center">
            <CalendarDays
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="font-heading text-xl font-semibold text-primary">
                Noch keine Termine geplant
              </p>
              <p className="text-muted-foreground">
                Lege deinen ersten Termin an — Terminart und Ort bestimmen, was
                später automatisch passiert.
              </p>
            </div>
            <Button asChild>
              <Link href="/termine/neu">
                <Plus aria-hidden />
                Ersten Termin anlegen
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {kommende.length > 0 && (
        <Abschnitt titel="Kommende Termine">
          <Liste termine={kommende} />
        </Abschnitt>
      )}

      {kommende.length === 0 && vergangene.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-10 text-center">
            <ClipboardList
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden
            />
            <p className="text-muted-foreground">
              Kein kommender Termin. Unten stehen die vergangenen.
            </p>
            <Button asChild variant="secondary">
              <Link href="/termine/neu">Neuen Termin anlegen</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {vergangene.length > 0 && (
        <Abschnitt titel="Vergangene Termine">
          <Liste termine={vergangene} />
        </Abschnitt>
      )}
    </div>
  );
}
