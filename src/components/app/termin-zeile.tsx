import {
  BuildingIcon,
  ChevronRightIcon,
  MapPinIcon,
  PhoneIcon,
  VideoIcon,
} from "lucide-react";

import { Zeile } from "@/components/ui/liste";
import { Schild } from "@/components/ui/schild";
import type { Termin } from "@/lib/termine/abfragen";
import type { BestaetigungsStand } from "@/lib/termine/mail";
import { ORTE, terminartLabel, type Ort } from "@/lib/termine/terminarten";
import {
  formatiereTag,
  formatiereUhrzeit,
  formatiereWochentag,
} from "@/lib/zeit";

/** „Beratung — Max Mustermann", bei Vorbereitungen nur „Vorbereitung". */
export function terminTitel(termin: Termin): string {
  if (termin.kind === "vorbereitung") return "Vorbereitung";
  const art = terminartLabel(termin.terminart ?? "");
  return termin.kunde ? `${art} — ${termin.kunde.name}` : art;
}

const ORT_SYMBOL: Record<Ort, React.ReactNode> = {
  buero: <BuildingIcon aria-hidden />,
  digital: <VideoIcon aria-hidden />,
  telefon: <PhoneIcon aria-hidden />,
  anderer: <MapPinIcon aria-hidden />,
};

/** Der Ort als Schild mit Symbol — bei „Anderer Ort" steht die Adresse drin. */
export function OrtSchild({ termin }: { termin: Pick<Termin, "ort" | "ortAdresse"> }) {
  return (
    <Schild ton="rahmen" icon={ORT_SYMBOL[termin.ort]} className="whitespace-normal">
      {termin.ort === "anderer" && termin.ortAdresse ? termin.ortAdresse : ORTE[termin.ort]}
    </Schild>
  );
}

const STAND_WORT: Record<Exclude<BestaetigungsStand, null>, string> = {
  offen: "Bestätigung offen",
  geaendert: "Bestätigung erneut senden",
};

/**
 * Eine Terminzeile in Übersicht und Terminliste: links die Zeit in
 * Tabellenziffern, dann Titel und Schilder, rechts der Pfeil. Die ganze Zeile
 * ist der Link.
 */
export function TerminZeile({
  termin,
  stand = null,
}: {
  termin: Termin;
  stand?: BestaetigungsStand;
}) {
  return (
    <Zeile href={`/termine/${termin.id}`}>
      <div className="tabellenziffern w-32 shrink-0">
        <p className="text-marine">
          {formatiereWochentag(termin.beginn)} {formatiereTag(termin.beginn)}
        </p>
        <p className="text-klein text-marine-mittel">
          {formatiereUhrzeit(termin.beginn)} – {formatiereUhrzeit(termin.ende)} Uhr
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-bold text-marine">{terminTitel(termin)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {termin.kind === "kundentermin" && <OrtSchild termin={termin} />}
          {termin.partner && <Schild>mit {termin.partner.name}</Schild>}
          {!termin.eigener && termin.besitzer && (
            <Schild ton="rahmen">Termin von {termin.besitzer.name}</Schild>
          )}
          {termin.kundeZugesagtAm && <Schild ton="gruen">Kunde hat zugesagt</Schild>}
          {stand && <Schild ton="orange">{STAND_WORT[stand]}</Schild>}
          {termin.status === "wahrgenommen" && <Schild ton="gruen">Wahrgenommen</Schild>}
          {termin.status === "abgesagt" && <Schild ton="ziegel">Abgesagt</Schild>}
        </div>
      </div>

      <ChevronRightIcon className="size-5 shrink-0 text-marine-mittel" aria-hidden />
    </Zeile>
  );
}
