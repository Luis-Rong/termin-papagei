"use client";

import { CalendarCheckIcon, ExternalLinkIcon, UnlinkIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { googleTrennen } from "@/app/(app)/einstellungen/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Button } from "@/components/ui/button";
import { Meldung } from "@/components/ui/meldung";
import type { Kalenderverbindung } from "@/lib/kalender";
import { formatiereDatum } from "@/lib/zeit";

/** Rückmeldung aus dem Rücksprung von Google (siehe /google/verbunden). */
export type GoogleRueckmeldung = {
  art: "verbunden" | "abgebrochen" | "fehler";
  grund?: string;
};

function Rueckmeldung({ art, grund }: GoogleRueckmeldung) {
  if (art === "verbunden") {
    return (
      <Meldung art="erfolg" wort="Verbunden">
        Neue Termine landen ab sofort in deinem Google-Kalender.
      </Meldung>
    );
  }

  if (art === "abgebrochen") {
    return <Meldung wort="Abgebrochen">Es hat sich nichts geändert.</Meldung>;
  }

  return (
    <Meldung art="fehler">
      Die Verbindung hat nicht geklappt.{grund ? ` Google meldet: ${grund}` : ""}
    </Meldung>
  );
}

/** Verbunden: Adresse zeigen und das Trennen anbieten — mit Rückfrage. */
function Trennen() {
  const [nachfrage, setNachfrage] = useState(false);
  const [meldung, action, laeuft] = useActionState<FormularStatus, FormData>(
    googleTrennen,
    {},
  );

  if (!nachfrage) {
    return (
      <div className="space-y-3">
        <MeldeStatus status={meldung} />
        <Button variante="sekundaer" klein onClick={() => setNachfrage(true)}>
          <UnlinkIcon aria-hidden />
          Verbindung trennen
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <MeldeStatus status={meldung} />

      <Meldung art="hinweis" wort="Trennen?">
        Neue Termine landen dann nicht mehr in deinem Google-Kalender und
        digitale Termine bekommen keinen Meet-Link. Eingetragene Termine bleiben.
      </Meldung>

      <div className="flex flex-wrap gap-4">
        <Button type="submit" klein laeuft={laeuft}>
          {laeuft ? "Wird getrennt …" : "Ja, Verbindung trennen"}
        </Button>
        <Button
          type="button"
          variante="sekundaer"
          klein
          onClick={() => setNachfrage(false)}
          disabled={laeuft}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

export function GoogleVerbindung({
  verbindung,
  eingerichtet,
  rueckmeldung,
}: {
  verbindung: Kalenderverbindung | null;
  eingerichtet: boolean;
  rueckmeldung?: GoogleRueckmeldung;
}) {
  // Ohne hinterlegte Zugangsdaten führt der Knopf ins Leere — dann lieber
  // ehrlich sagen, woran es liegt.
  if (!eingerichtet) {
    return (
      <Meldung art="hinweis" wort="Nicht eingerichtet">
        Auf diesem Server fehlen <code>GOOGLE_CLIENT_ID</code> und{" "}
        <code>GOOGLE_CLIENT_SECRET</code> (Anleitung in der README).
      </Meldung>
    );
  }

  if (verbindung) {
    return (
      <div className="space-y-6">
        {rueckmeldung && <Rueckmeldung {...rueckmeldung} />}

        <p className="flex gap-3">
          <CalendarCheckIcon className="mt-1 size-5 shrink-0 text-marine-mittel" aria-hidden />
          <span>
            Verbunden mit <strong>{verbindung.googleEmail}</strong>
            <span className="block text-klein text-marine-mittel">
              seit {formatiereDatum(verbindung.verbundenSeit)}
            </span>
          </span>
        </p>

        <Trennen />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rueckmeldung && <Rueckmeldung {...rueckmeldung} />}

      {/* Bewusst ein Link und kein Formular: Der Weg zu Google ist ein
          gewöhnlicher Seitenaufruf, der den Browser wirklich verlassen soll. */}
      <Button asChild variante="sekundaer">
        <a href="/google/verbinden">
          <ExternalLinkIcon aria-hidden />
          Mit Google Kalender verbinden
        </a>
      </Button>

      <p className="text-klein text-marine-mittel">
        Google zeigt beim ersten Mal einen Hinweis: „Erweitert“, dann „Weiter zu Termin Papagei“.
      </p>
    </div>
  );
}
