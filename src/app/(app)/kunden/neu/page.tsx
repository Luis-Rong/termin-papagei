import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { KundenFormular } from "@/components/app/kunden-formular";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Neuer Kunde — Termin Tiger" };

export default function NeuerKundeSeite() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/kunden"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Zurück zur Kundenliste
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold text-primary">
          Neuer Kunde
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Kontaktdaten
          </CardTitle>
          <CardDescription>
            Diese Angaben verwenden wir später für Einladungen und Erinnerungen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KundenFormular />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Kunde eines Vertriebspartners
          </CardTitle>
          <CardDescription>
            Ob ein Kunde über einen Partner kam, lässt sich ab Phase 3
            hinterlegen — dann gibt es die Partnersuche und die Freundesliste,
            aus der du auswählst.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
