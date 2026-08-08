import type { Metadata } from "next";

import { BaldVerfuegbar } from "@/components/app/bald-verfuegbar";

export const metadata: Metadata = { title: "Partner — Termin Tiger" };

export default function PartnerSeite() {
  return (
    <BaldVerfuegbar
      titel="Partner"
      phase="Phase 3"
      beschreibung="Andere Vertriebspartner suchen, Anfragen senden und annehmen — die Basis für gemeinsame Kundentermine in beiden Kalendern."
    />
  );
}
