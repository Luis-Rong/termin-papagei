"use client";

import { CheckIcon, Undo2Icon, UserMinusIcon, UserPlusIcon, XIcon } from "lucide-react";
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
import { Meldung } from "@/components/ui/meldung";

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
  variante = "sekundaer",
  icon: Icon,
}: {
  aktion: Aktion;
  feld: "id" | "partnerId";
  wert: string;
  beschriftung: string;
  laeuftBeschriftung: string;
  variante?: ComponentProps<typeof Button>["variante"];
  icon: typeof CheckIcon;
}) {
  const [status, action, laeuft] = useActionState<FormularStatus, FormData>(
    aktion,
    {},
  );

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name={feld} value={wert} />
      <Button type="submit" klein variante={variante} laeuft={laeuft}>
        <Icon aria-hidden />
        {laeuft ? laeuftBeschriftung : beschriftung}
      </Button>
      {status.fehler && (
        <Meldung art="fehler" className="max-w-xs">
          {status.fehler}
        </Meldung>
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
      icon={UserPlusIcon}
    />
  );
}

/** Eingegangene Anfrage annehmen oder ablehnen. */
export function AnfrageBeantworten({ id }: { id: string }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <AktionsForm
        aktion={anfrageAnnehmen}
        feld="id"
        wert={id}
        beschriftung="Annehmen"
        laeuftBeschriftung="Einen Moment …"
        variante="primaer"
        icon={CheckIcon}
      />
      <AktionsForm
        aktion={anfrageAblehnen}
        feld="id"
        wert={id}
        beschriftung="Ablehnen"
        laeuftBeschriftung="Einen Moment …"
        icon={XIcon}
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
      icon={Undo2Icon}
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
      <Button variante="sekundaer" klein onClick={() => setNachfrage(true)}>
        <UserMinusIcon aria-hidden />
        Beenden
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <input type="hidden" name="id" value={id} />

      <p className="text-klein">
        Partnerschaft mit <strong>{name}</strong> beenden?
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" klein laeuft={laeuft}>
          {laeuft ? "Wird beendet …" : "Ja, beenden"}
        </Button>
        <Button
          type="button"
          klein
          variante="sekundaer"
          onClick={() => setNachfrage(false)}
          disabled={laeuft}
        >
          Abbrechen
        </Button>
      </div>

      {status.fehler && <Meldung art="fehler">{status.fehler}</Meldung>}
    </form>
  );
}
