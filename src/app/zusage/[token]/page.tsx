import { CalendarPlus, Check, Clock, MapPin, Video } from "lucide-react";
import type { Metadata } from "next";

import { terminZusagen } from "@/app/zusage/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { anfrageHerkunft } from "@/lib/herkunft";
import {
  googleKalenderLink,
  icsUrl,
  kundenTerminTitel,
} from "@/lib/termine/kundenlinks";
import { ORTE } from "@/lib/termine/terminarten";
import { zusageTerminLaden } from "@/lib/termine/zusage";
import { formatiereDatum, formatiereUhrzeit, formatiereZeitraum } from "@/lib/zeit";

// Der Link ist der Ausweis des Kunden — Suchmaschinen haben hier nichts verloren.
export const metadata: Metadata = {
  title: "Ihr Termin",
  robots: { index: false, follow: false },
};

function Rahmen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 py-8">{children}</CardContent>
      </Card>
    </main>
  );
}

/**
 * Die Seite hinter dem Knopf "Termin zusagen" in der Bestätigungsmail. Ohne
 * Login: Wer den Link kennt, sieht genau diesen Termin und kann ihn zusagen.
 */
export default async function ZusageSeite({ params }: PageProps<"/zusage/[token]">) {
  const { token } = await params;
  const termin = await zusageTerminLaden(token);

  if (!termin) {
    return (
      <Rahmen>
        <h1 className="font-heading text-2xl font-bold text-primary">
          Termin nicht gefunden
        </h1>
        <p className="text-muted-foreground">
          Dieser Link ist nicht mehr gültig. Bitte melden Sie sich direkt bei
          Ihrem Berater.
        </p>
      </Rahmen>
    );
  }

  // eslint-disable-next-line react-hooks/purity -- Server-Komponente: wird je Anfrage einmal gerendert.
  const vorbei = new Date(termin.beginn).getTime() <= Date.now();
  const abgesagt = termin.status === "abgesagt";
  const basis = await anfrageHerkunft();

  return (
    <Rahmen>
      <div>
        <p className="text-sm text-muted-foreground">
          {termin.firma ?? termin.vermittler}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-primary">
          {kundenTerminTitel(termin)}
        </h1>
      </div>

      <ul className="space-y-2 text-sm">
        <li className="flex gap-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          {formatiereZeitraum(termin.beginn, termin.ende)}
        </li>
        <li className="flex gap-3">
          {termin.ort === "digital" ? (
            <Video className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span>
            {ORTE[termin.ort]}
            {termin.ort === "digital" && termin.meetLink && (
              <>
                {" — "}
                <a
                  href={termin.meetLink}
                  className="text-primary underline underline-offset-4"
                >
                  Link zum Videotermin
                </a>
              </>
            )}
          </span>
        </li>
      </ul>

      {abgesagt ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          Dieser Termin wurde abgesagt. Bitte melden Sie sich bei Ihrem Berater,
          wenn Sie einen neuen Termin vereinbaren möchten.
        </p>
      ) : termin.zugesagtAm ? (
        <p className="flex gap-2 rounded-md border border-primary/30 bg-secondary px-3 py-2 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Vielen Dank — Sie haben den Termin am {formatiereDatum(termin.zugesagtAm)} um{" "}
            {formatiereUhrzeit(termin.zugesagtAm)} Uhr zugesagt.
          </span>
        </p>
      ) : vorbei ? (
        <p className="text-sm text-muted-foreground">
          Dieser Termin liegt in der Vergangenheit.
        </p>
      ) : (
        <form action={terminZusagen}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" size="lg" className="w-full">
            <Check aria-hidden />
            Termin zusagen
          </Button>
        </form>
      )}

      {!abgesagt && !vorbei && (
        <div className="space-y-2 border-t pt-5">
          <p className="text-sm font-medium">In den Kalender übernehmen</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={googleKalenderLink(termin)} target="_blank" rel="noopener noreferrer">
                <CalendarPlus aria-hidden />
                Google Kalender
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={icsUrl(basis, token)}>
                <CalendarPlus aria-hidden />
                Apple / Outlook
              </a>
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Passt der Termin nicht? Dann antworten Sie einfach auf die E-Mail Ihres
        Beraters.
      </p>
    </Rahmen>
  );
}
