import type { Metadata } from "next";

import { BaldVerfuegbar } from "@/components/app/bald-verfuegbar";

export const metadata: Metadata = { title: "Kunden — Termin Tiger" };

export default function KundenSeite() {
  return (
    <BaldVerfuegbar
      titel="Kunden"
      phase="Phase 2"
      beschreibung="Kunden anlegen, bearbeiten und durchsuchen — mit Unterscheidung zwischen eigenen Kunden und Kunden eines Vertriebspartners."
    />
  );
}
