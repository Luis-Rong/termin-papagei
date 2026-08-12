import type { Metadata } from "next";

import { BaldVerfuegbar } from "@/components/app/bald-verfuegbar";

export const metadata: Metadata = { title: "Vorlagen — Termin Papagei" };

export default function VorlagenSeite() {
  return (
    <BaldVerfuegbar
      titel="Vorlagen"
      phase="Phase 6"
      beschreibung="E-Mail-Vorlagen für Bestätigungen und Erinnerungen anlegen und bearbeiten. Eure bestehenden Vorlagen werden hier hinterlegt."
    />
  );
}
