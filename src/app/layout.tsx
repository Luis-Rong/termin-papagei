import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Termin Tiger — Terminierung für Finanzdienstleister",
  description:
    "Termine anlegen, Google-Kalender synchronisieren und automatisch personalisierte Einladungen und Erinnerungen verschicken — gebaut für Versicherungs- und Finanzvermittler.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
