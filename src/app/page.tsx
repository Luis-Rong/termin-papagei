import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const funktionen = [
  {
    titel: "Termine in Minuten",
    text: "Kunde anlegen, Terminart wählen, fertig. Erstgespräch, Beratung, Umsetzung, After-Sales und Service — mit allen Regeln automatisch im Griff.",
  },
  {
    titel: "Kalender & Meet automatisch",
    text: "Jeder Termin landet direkt im Google-Kalender — bei digitalen Terminen inklusive fertigem Google-Meet-Link in der Einladung.",
  },
  {
    titel: "Einladungen & Erinnerungen",
    text: "Bestätigungen und Erinnerungen gehen automatisch raus — persönlich formuliert auf Basis Ihrer eigenen Vorlagen.",
  },
  {
    titel: "Partner-Netzwerk",
    text: "Vertriebspartner finden, verbinden und gemeinsame Kundentermine koordinieren — der Termin landet in beiden Kalendern.",
  },
];

export default function Home() {
  return (
    <>
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-heading text-2xl font-bold tracking-tight">
            Termin Tiger
          </span>
          <Button variant="secondary" asChild>
            <Link href="/login">Anmelden</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center">
            <Badge variant="secondary" className="mb-6">
              Für Vermittler nach §34d / §34f GewO
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              Terminierung, die für Sie arbeitet.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg opacity-90">
              Termin Tiger übernimmt Kalendereinträge, Einladungen und
              Erinnerungen für Ihre Kundentermine — damit Sie sich auf die
              Beratung konzentrieren können.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/registrieren">Jetzt starten</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <a href="#funktionen">Mehr erfahren</a>
              </Button>
            </div>
          </div>
        </section>

        <section id="funktionen" className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold text-primary">
            Alles für Ihren Terminprozess
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {funktionen.map((f) => (
              <Card key={f.titel} className="border-secondary bg-card">
                <CardHeader>
                  <CardTitle className="font-heading text-xl text-primary">
                    {f.titel}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {f.text}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-secondary">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-8 text-sm text-secondary-foreground sm:flex-row sm:justify-between">
          <span className="font-heading font-semibold">Termin Tiger</span>
          <span className="opacity-75">
            In Entwicklung — Impressum &amp; Datenschutz folgen zum Start.
          </span>
        </div>
      </footer>
    </>
  );
}
