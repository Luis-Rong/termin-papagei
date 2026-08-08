import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Platzhalter für Bereiche, die in einer späteren Phase gebaut werden. */
export function BaldVerfuegbar({
  titel,
  beschreibung,
  phase,
}: {
  titel: string;
  beschreibung: string;
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-bold text-primary">{titel}</h1>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Kommt in {phase}
          </CardTitle>
          <CardDescription>{beschreibung}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
