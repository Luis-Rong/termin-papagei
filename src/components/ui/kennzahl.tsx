import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Kennzahl-Baustein (CD 6): die Zahl groß in Serifen, darunter die
 * Erklärzeile. Als klickbare Karte mit Pfeil und verborgenem Wort (B8).
 */
export function Kennzahl({
  wert,
  erklaerung,
  vergleich,
  href,
}: {
  wert: ReactNode;
  erklaerung: string;
  vergleich?: ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="karte karte-klickbar relative block no-underline">
      <ArrowRightIcon
        className="absolute top-6 right-6 size-5 text-marine-mittel"
        aria-hidden
      />
      <span className="sr-only">Öffnen</span>
      <p className="tabellenziffern font-serif text-titel text-marine">{wert}</p>
      <p className="mt-1 text-klein text-marine-mittel">{erklaerung}</p>
      {vergleich && (
        <p className="mt-4 border-t border-sand pt-3 text-klein text-marine">{vergleich}</p>
      )}
    </Link>
  );
}
