import { CalendarCheck, CalendarOff, Video } from "lucide-react";
import Link from "next/link";

import { KalenderNachtragen } from "@/components/app/termin-aktionen";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Zeigt, ob der Termin im Google-Kalender steht, und den Meet-Link.
 *
 * Bewusst nicht nur eine Erfolgsmeldung: Wenn beim Anlegen kein Kalender
 * verbunden war oder Google gerade nicht mitspielte, sieht man das hier — und
 * kann es mit einem Klick nachholen.
 */
export function TerminKalender({
  terminId,
  eigener,
  digital,
  meetLink,
  imKalender,
  verbunden,
  partnerName,
}: {
  terminId: string;
  eigener: boolean;
  digital: boolean;
  meetLink: string | null;
  imKalender: boolean;
  verbunden: boolean;
  partnerName?: string | null;
}) {
  // Für einen fremden Termin gibt es nur dann etwas zu zeigen, wenn ein
  // Meet-Link existiert — der Kalender des anderen geht mich nichts an.
  if (!eigener && !meetLink) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl text-primary">
          Kalender
        </CardTitle>
        {eigener && (
          <CardDescription>
            {digital
              ? "Digitale Termine bekommen beim Eintragen automatisch einen Meet-Link."
              : "Termine landen automatisch in deinem Google-Kalender, sobald er verbunden ist."}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {meetLink && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Video className="size-4 shrink-0 text-primary" aria-hidden />
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all underline underline-offset-4"
            >
              {meetLink}
            </a>
          </p>
        )}

        {eigener && !verbunden && (
          <p className="text-sm text-muted-foreground">
            Dein Google-Kalender ist nicht verbunden — trage den Termin bis
            dahin selbst in deinen Kalender ein. Verbinden kannst du ihn in den{" "}
            <Link href="/einstellungen" className="underline underline-offset-4">
              Einstellungen
            </Link>
            .
          </p>
        )}

        {eigener && verbunden && imKalender && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm">
              <CalendarCheck
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <span>
                Steht in deinem Google-Kalender.
                {partnerName
                  ? ` ${partnerName} ist als Teilnehmer eingetragen — ist der Kalender dort ebenfalls verbunden, liegt der Termin auch darin.`
                  : ""}
              </span>
            </p>

            {digital && !meetLink && (
              <>
                <p className="text-sm text-muted-foreground">
                  Einen Meet-Link gibt es noch nicht.
                </p>
                <KalenderNachtragen
                  id={terminId}
                  beschriftung="Meet-Link erzeugen"
                />
              </>
            )}
          </div>
        )}

        {eigener && verbunden && !imKalender && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm">
              <CalendarOff
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden
              />
              <span>
                Dieser Termin steht noch nicht in deinem Google-Kalender.
              </span>
            </p>
            <KalenderNachtragen
              id={terminId}
              beschriftung="In den Kalender eintragen"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
