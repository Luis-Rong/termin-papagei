import type { Metadata } from "next";

import { BaldVerfuegbar } from "@/components/app/bald-verfuegbar";

export const metadata: Metadata = { title: "Termine — Termin Tiger" };

export default function TermineSeite() {
  return (
    <BaldVerfuegbar
      titel="Termine"
      phase="Phase 4"
      beschreibung="Der Termin-Wizard und die Terminliste: Terminart wählen, vor Ort oder digital, Vorbereitungstermine und Notizen — später mit Google-Kalender und automatischen E-Mails."
    />
  );
}
