import {
  BuildingIcon,
  CalendarPlusIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  VideoIcon,
} from "lucide-react";
import type { Metadata } from "next";

import { terminZusagen } from "@/app/zusage/actions";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Meldung } from "@/components/ui/meldung";
import { anfrageHerkunft } from "@/lib/herkunft";
import {
  googleKalenderLink,
  icsUrl,
  kundenTerminTitel,
} from "@/lib/termine/kundenlinks";
import { ORTE, type Ort } from "@/lib/termine/terminarten";
import { zusageTerminLaden } from "@/lib/termine/zusage";
import { formatiereDatum, formatiereUhrzeit, formatiereZeitraum } from "@/lib/zeit";

// Der Link ist der Ausweis des Kunden — Suchmaschinen haben hier nichts verloren.
export const metadata: Metadata = {
  title: "Dein Termin · Masangkay & Partner",
  robots: { index: false, follow: false },
};

const ORT_SYMBOL: Record<Ort, React.ReactNode> = {
  buero: <BuildingIcon className="mt-1 size-5 shrink-0 text-marine-mittel" aria-hidden />,
  digital: <VideoIcon className="mt-1 size-5 shrink-0 text-marine-mittel" aria-hidden />,
  telefon: <PhoneIcon className="mt-1 size-5 shrink-0 text-marine-mittel" aria-hidden />,
  anderer: <MapPinIcon className="mt-1 size-5 shrink-0 text-marine-mittel" aria-hidden />,
};

/** Die Seite für den Kunden: Logo oben, eine Karte, nichts sonst. */
function Rahmen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-papier px-4 py-12">
      <Logo className="mb-8 w-44" />
      <div className="karte w-full max-w-md space-y-6 p-8">{children}</div>
    </main>
  );
}

/**
 * Die Seite hinter dem Knopf „Termin zusagen" in der Bestätigungsmail. Ohne
 * Login: Wer den Link kennt, sieht genau diesen Termin und kann ihn zusagen.
 */
export default async function ZusageSeite({ params }: PageProps<"/zusage/[token]">) {
  const { token } = await params;
  const termin = await zusageTerminLaden(token);

  if (!termin) {
    return (
      <Rahmen>
        <div>
          <h1 className="font-serif text-h2 text-marine">Termin nicht gefunden</h1>
          <span className="strich" aria-hidden />
        </div>
        <p>
          Dieser Link ist nicht mehr gültig. Melde dich am besten direkt bei
          deinem Berater.
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
        <p className="marke text-ziegel">{termin.firma ?? termin.vermittler}</p>
        <h1 className="mt-2 font-serif text-h2 text-marine">{kundenTerminTitel(termin)}</h1>
        <span className="strich" aria-hidden />
      </div>

      <ul className="space-y-3">
        <li className="flex gap-3">
          <ClockIcon className="mt-1 size-5 shrink-0 text-marine-mittel" aria-hidden />
          <span className="tabellenziffern">{formatiereZeitraum(termin.beginn, termin.ende)}</span>
        </li>
        <li className="flex gap-3">
          {ORT_SYMBOL[termin.ort]}
          <span>
            {termin.ort === "anderer" && termin.adresse ? termin.adresse : ORTE[termin.ort]}
            {termin.ort === "digital" && termin.meetLink && (
              <>
                {" — "}
                <a href={termin.meetLink}>Link zum Videotermin</a>
              </>
            )}
          </span>
        </li>
      </ul>

      {abgesagt ? (
        <Meldung art="fehler" wort="Abgesagt">
          Dieser Termin wurde abgesagt. Melde dich bei deinem Berater, wenn du
          einen neuen Termin möchtest.
        </Meldung>
      ) : termin.zugesagtAm ? (
        <Meldung art="erfolg" wort="Zugesagt">
          Vielen Dank — du hast den Termin am {formatiereDatum(termin.zugesagtAm)} um{" "}
          {formatiereUhrzeit(termin.zugesagtAm)} Uhr zugesagt.
        </Meldung>
      ) : vorbei ? (
        <p className="text-marine-mittel">Dieser Termin liegt in der Vergangenheit.</p>
      ) : (
        <form action={terminZusagen}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" voll>
            <CheckIcon aria-hidden />
            Termin zusagen
          </Button>
        </form>
      )}

      {!abgesagt && !vorbei && (
        <div className="border-t border-sand pt-6">
          <p className="marke mb-3 text-marine-mittel">In den Kalender übernehmen</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variante="sekundaer" klein>
              <a href={googleKalenderLink(termin)} target="_blank" rel="noopener noreferrer">
                <CalendarPlusIcon aria-hidden />
                Google Kalender
              </a>
            </Button>
            <Button asChild variante="sekundaer" klein>
              <a href={icsUrl(basis, token)}>
                <CalendarPlusIcon aria-hidden />
                Apple / Outlook
              </a>
            </Button>
          </div>
        </div>
      )}

      <p className="text-klein text-marine-mittel">
        Passt der Termin nicht? Antworte einfach auf die E-Mail deines Beraters.
      </p>
    </Rahmen>
  );
}
