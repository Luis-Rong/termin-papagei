import type { Metadata } from "next";
import { Spectral } from "next/font/google";

import "./globals.css";

/**
 * Überschriften laufen in der Ersatzkette des Corporate Designs:
 * Canela Text → Spectral → Palatino. Canela ist lizenzpflichtig, deshalb trägt
 * am Bildschirm Spectral — beim Bauen heruntergeladen und von hier ausgeliefert,
 * zur Laufzeit geht keine Anfrage an Google.
 */
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Termin-Papagei · Masangkay & Partner",
  description:
    "Kundentermine anlegen — Bestätigung, Erinnerungen und Kalendereintrag laufen von selbst.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`h-full antialiased ${spectral.variable}`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
