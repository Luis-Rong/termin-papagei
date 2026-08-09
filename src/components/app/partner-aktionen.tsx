"use client";

import { Check, Undo2, UserMinus, UserPlus, X } from "lucide-react";
import type { ComponentProps } from "react";
import { useActionState, useState } from "react";

import {
  anfrageAblehnen,
  anfrageAnnehmen,
  anfrageSenden,
  anfrageZuruecknehmen,
  partnerschaftBeenden,
} from "@/app/(app)/partner/actions";
import type { FormularStatus } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

type Aktion = (
  status: FormularStatus,
  formData: FormData,
) => Promise<FormularStatus>;

/**
 * Ein Knopf, der eine Server Action auslöst. Jede Zeile in den Partnerlisten
 * bekommt so ihre eigene Fehlermeldung, ohne die ganze Seite zu stören.
 */
function AktionsForm({
  aktion,
  feld,
  wert,
  beschriftung,
  laeuftBeschriftung,
  variant,
  icon: Icon,
}: {
  aktion: Aktion;
  feld: "id" | "partnerId";
  wert: string;
  beschriftung: string;
  laeuftBeschriftung: string;
  variant?: ComponentProps<typeof Button>["variant"];
  icon: typeof Check;
}) {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    aktion,
    {},
  );

  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name={feld} value={wert} />
      <Button type="submit" size="sm" variant={variant} disabled={laeuft}>
        <Icon aria-hidden />
        {laeuft ? laeuftBeschriftung : beschriftung}
      </Button>
      {status.fehler && (
        <p className="max-w-64 text-sm text-destructive">{status.fehler}</p>
      )}
    </form>
  );
}

/** Suchergebnis: Anfrage an einen anderen Vermittler stellen. */
export function AnfrageSenden({ partnerId }: { partnerId: string }) {
  return (
    <AktionsForm
      aktion={anfrageSenden}
      feld="partnerId"
      wert={partnerId}
      beschriftung="Anfragen"
      laeuftBeschriftung="Wird gesendet …"
      icon={UserPlus}
    />
  );
}

/** Eingegangene Anfrage annehmen oder ablehnen. */
export function AnfrageBeantworten({ id }: { id: string }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <AktionsForm
        aktion={anfrageAnnehmen}
        feld="id"
        wert={id}
        beschriftung="Annehmen"
        laeuftBeschriftung="Einen Moment …"
        icon={Check}
      />
      <AktionsForm
        aktion={anfrageAblehnen}
        feld="id"
        wert={id}
        beschriftung="Ablehnen"
        laeuftBeschriftung="Einen Moment …"
        variant="ghost"
        icon={X}
      />
    </div>
  );
}

/** Eigene, noch offene Anfrage wieder zurückziehen. */
export function AnfrageZuruecknehmen({ id }: { id: string }) {
  return (
    <AktionsForm
      aktion={anfrageZuruecknehmen}
      feld="id"
      wert={id}
      beschriftung="Zurücknehmen"
      laeuftBeschriftung="Einen Moment …"
      variant="ghost"
      icon={Undo2}
    />
  );
}

/** Bestehende Partnerschaft beenden — erst der zweite Klick zählt. */
export function PartnerschaftBeenden({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [nachfrage, setNachfrage] = useState(false);
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    partnerschaftBeenden,
    {},
  );

  if (!nachfrage) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setNachfrage(true)}>
        <UserMinus aria-hidden />
        Partnerschaft beenden
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="id" value={id} />

      <p className="text-sm">
        Partnerschaft mit <strong className="font-semibold">{name}</strong>{" "}
        wirklich beenden?
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={laeuft}>
          {laeuft ? "Wird beendet …" : "Ja, beenden"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setNachfrage(false)}
          disabled={laeuft}
        >
          Abbrechen
        </Button>
      </div>

      {status.fehler && (
        <p className="text-sm text-destructive">{status.fehler}</p>
      )}
    </form>
  );
}
