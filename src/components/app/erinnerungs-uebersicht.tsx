import { BellOff, Check, Clock, PhoneCall, XCircle } from "lucide-react";

import {
  ERINNERUNGS_ARTEN,
  ERINNERUNGS_LABEL,
  type ErinnerungsArt,
  type ErinnerungsZustand,
} from "@/lib/erinnerungen/plan";
import { formatiereDatum, formatiereUhrzeit } from "@/lib/zeit";

function zeitpunkt(wert: Date | string): string {
  const iso = typeof wert === "string" ? wert : wert.toISOString();
  return `${formatiereDatum(iso)}, ${formatiereUhrzeit(iso)} Uhr`;
}

function Zeile({ art, zustand }: { art: ErinnerungsArt; zustand: ErinnerungsZustand }) {
  const [Icon, text, farbe] = (() => {
    switch (zustand.zustand) {
      case "verschickt":
        return [Check, `Verschickt am ${zeitpunkt(zustand.am)}`, "text-primary"];
      case "geplant":
        return [Clock, `Geht raus am ${zeitpunkt(zustand.faellig)}`, "text-foreground"];
      case "faellig":
        return [Clock, "Geht mit dem nächsten Durchlauf raus (spätestens in 15 Minuten)", "text-foreground"];
      case "aus":
        return [BellOff, "Für diesen Termin abgeschaltet", "text-muted-foreground"];
      case "entfaellt":
        return [XCircle, `Entfällt — ${zustand.grund}`, "text-muted-foreground"];
    }
  })();

  return (
    <li className="flex gap-3 py-2.5 text-sm">
      {art === "anruf_erinnerung" ? (
        <PhoneCall className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : (
        <Icon className={`mt-0.5 size-4 shrink-0 ${farbe}`} aria-hidden />
      )}
      <div>
        <p className="font-medium">{ERINNERUNGS_LABEL[art]}</p>
        <p className={farbe}>{text}</p>
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
    <ul className="divide-y">
      {ERINNERUNGS_ARTEN.map((art) => {
        const zustand = plan[art];
        return zustand ? <Zeile key={art} art={art} zustand={zustand} /> : null;
      })}
    </ul>
  );
}
