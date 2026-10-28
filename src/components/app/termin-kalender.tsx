import { CalendarCheckIcon, CalendarOffIcon, VideoIcon } from "lucide-react";
import Link from "next/link";

import { KalenderNachtragen } from "@/components/app/termin-aktionen";
import { Karte, KarteKopf } from "@/components/ui/karte";
import { Meldung } from "@/components/ui/meldung";

/**
 * Ob der Termin im Google-Kalender steht, und der Meet-Link. Bewusst nicht nur
 * eine Erfolgsmeldung: Fehlte beim Anlegen der Kalender oder spielte Google
 * nicht mit, sieht man das hier — und holt es mit einem Klick nach.
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
    <Karte>
      <KarteKopf titel="Kalender" />

      <div className="space-y-4 text-klein">
        {meetLink && (
          <p className="flex gap-3">
            <VideoIcon className="mt-0.5 size-5 shrink-0 text-marine-mittel" aria-hidden />
            <a href={meetLink} target="_blank" rel="noopener noreferrer" className="break-all">
              {meetLink}
            </a>
          </p>
        )}

        {eigener && !verbunden && (
          <p className="flex gap-3">
            <CalendarOffIcon className="mt-0.5 size-5 shrink-0 text-marine-mittel" aria-hidden />
            <span>
              Kein Google-Kalender verbunden —{" "}
              <Link href={`/einstellungen?zurueck=${encodeURIComponent(`/termine/${terminId}`)}`}>
                Einstellungen
              </Link>
            </span>
          </p>
        )}

        {eigener && verbunden && imKalender && (
          <>
            <p className="flex gap-3">
              <CalendarCheckIcon className="mt-0.5 size-5 shrink-0 text-marine-mittel" aria-hidden />
              <span>
                Steht in deinem Google-Kalender
                {partnerName ? `, ${partnerName} ist als Teilnehmer eingetragen` : ""}.
              </span>
            </p>
            {digital && !meetLink && (
              <KalenderNachtragen id={terminId} beschriftung="Meet-Link erzeugen" />
            )}
          </>
        )}

        {eigener && verbunden && !imKalender && (
          <>
            <Meldung art="hinweis">Steht noch nicht in deinem Google-Kalender.</Meldung>
            <KalenderNachtragen id={terminId} beschriftung="In den Kalender eintragen" />
          </>
        )}
      </div>
    </Karte>
  );
}
