import { BellOffIcon, CheckIcon, ClockIcon, PhoneCallIcon, XIcon } from "lucide-react";

import {
  ERINNERUNGS_ARTEN,
  erinnerungsLabel,
  type ErinnerungsArt,
  type ErinnerungsZustand,
} from "@/lib/erinnerungen/plan";
import { formatiereDatum, formatiereUhrzeit } from "@/lib/zeit";

function zeitpunkt(wert: Date | string): string {
  const iso = typeof wert === "string" ? wert : wert.toISOString();
  return `${formatiereDatum(iso)}, ${formatiereUhrzeit(iso)} Uhr`;
}

function Zeile({ art, zustand }: { art: ErinnerungsArt; zustand: ErinnerungsZustand }) {
  const [Icon, text] = (() => {
    switch (zustand.zustand) {
      case "verschickt":
        return [CheckIcon, `Verschickt am ${zeitpunkt(zustand.am)}`];
      case "geplant":
        return [ClockIcon, `Geht raus am ${zeitpunkt(zustand.faellig)}`];
      case "faellig":
        return [ClockIcon, "Geht in den nächsten 15 Minuten raus"];
      case "aus":
        return [BellOffIcon, "Abgeschaltet"];
      case "entfaellt":
        return [XIcon, `Entfällt — ${zustand.grund}`];
    }
  })();

  const Symbol = art === "anruf_erinnerung" ? PhoneCallIcon : Icon;

  return (
    <li className="flex gap-3 py-3 text-klein">
      <Symbol className="mt-0.5 size-5 shrink-0 text-marine-mittel" aria-hidden />
      <div>
        <p className="font-bold text-marine">
          {art === "anruf_erinnerung" ? "Anruf-Erinnerung an dich" : erinnerungsLabel(art)}
        </p>
        <p className="text-marine-mittel">{text}</p>
      </div>
    </li>
  );
}

/**
 * Was der Erinnerungs-Job für diesen Termin tun wird — berechnet mit
 * `erinnerungsPlan`, derselben Funktion, nach der der Job verschickt.
 */
export function ErinnerungsUebersicht({
  plan,
}: {
  plan: Partial<Record<ErinnerungsArt, ErinnerungsZustand>>;
}) {
  return (
    <ul className="-my-3 divide-y divide-sand">
      {ERINNERUNGS_ARTEN.map((art) => {
        const zustand = plan[art];
        return zustand ? <Zeile key={art} art={art} zustand={zustand} /> : null;
      })}
    </ul>
  );
}
