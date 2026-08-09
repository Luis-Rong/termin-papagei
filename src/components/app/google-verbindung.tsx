"use client";

import { CalendarCheck, ExternalLink, Unlink } from "lucide-react";
import { useActionState, useState } from "react";

import { googleTrennen } from "@/app/(app)/einstellungen/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { MeldeStatus } from "@/components/auth/melde-status";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
      <Alert className="border-primary/30 bg-secondary">
        <AlertDescription>
          Dein Google-Kalender ist verbunden. Neue Termine landen ab sofort
          automatisch darin.
        </AlertDescription>
      </Alert>
    );
  }

  if (art === "abgebrochen") {
    return (
      <Alert>
        <AlertDescription>
          Die Verbindung wurde abgebrochen — es hat sich nichts geändert. Du
          kannst es jederzeit erneut versuchen.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>
        Die Verbindung hat nicht geklappt.{grund ? ` Google meldet: ${grund}` : ""}
      </AlertDescription>
    </Alert>
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
        <Button variant="outline" onClick={() => setNachfrage(true)}>
          <Unlink aria-hidden />
          Verbindung trennen
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <MeldeStatus status={meldung} />

      <p className="text-sm">
        Verbindung wirklich trennen? Neue Termine landen dann nicht mehr in
        deinem Google-Kalender und digitale Termine bekommen keinen Meet-Link
        mehr. Bereits eingetragene Termine bleiben stehen.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="destructive" disabled={laeuft}>
          {laeuft ? "Wird getrennt …" : "Ja, Verbindung trennen"}
        </Button>
        <Button
          type="button"
          variant="ghost"
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
      <Alert>
        <AlertDescription>
          Die Google-Verbindung ist auf diesem Server noch nicht eingerichtet
          (es fehlen <code>GOOGLE_CLIENT_ID</code> und{" "}
          <code>GOOGLE_CLIENT_SECRET</code>). Die Anleitung dazu steht in der
          README unter „Google-Kalender einrichten“.
        </AlertDescription>
      </Alert>
    );
  }

  if (verbindung) {
    return (
      <div className="space-y-4">
        {rueckmeldung && <Rueckmeldung {...rueckmeldung} />}

        <div className="flex items-start gap-2 text-sm">
          <CalendarCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Verbunden mit <strong>{verbindung.googleEmail}</strong>
            <span className="block text-muted-foreground">
              seit {formatiereDatum(verbindung.verbundenSeit)}
            </span>
          </span>
        </div>

        <Trennen />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rueckmeldung && <Rueckmeldung {...rueckmeldung} />}

      <p className="text-sm text-muted-foreground">
        Beim ersten Verbinden zeigt Google einen Warnhinweis, weil die Anwendung
        nicht öffentlich geprüft ist. Das ist so vorgesehen: auf „Erweitert“
        klicken und dann „Weiter zu Termin Tiger“ wählen. Termin Tiger darf
        danach ausschließlich Termine in deinem Kalender anlegen und ändern.
      </p>

      {/* Bewusst ein Link und kein Formular: Der Weg zu Google ist ein
          gewöhnlicher Seitenaufruf. Kein <Link>, weil die Route den Browser
          wirklich verlassen soll statt clientseitig zu navigieren. */}
      <Button asChild>
        <a href="/google/verbinden">
          <ExternalLink aria-hidden />
          Mit Google Kalender verbinden
        </a>
      </Button>
    </div>
  );
}
