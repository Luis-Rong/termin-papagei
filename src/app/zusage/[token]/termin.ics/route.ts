import { icsDatei } from "@/lib/termine/kundenlinks";
import { zusageTerminLaden } from "@/lib/termine/zusage";

/** Kalenderdatei zum Termin — für Apple Kalender, Outlook und andere. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/zusage/[token]/termin.ics">,
) {
  const { token } = await params;
  const termin = await zusageTerminLaden(token);
  if (!termin) return new Response("Termin nicht gefunden.", { status: 404 });

  // Die UID bleibt je Termin gleich: Ein erneuter Download nach einer
  // Verschiebung aktualisiert den Eintrag, statt einen zweiten anzulegen.
  return new Response(icsDatei(termin, token.slice(0, 32)), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="termin.ics"',
      "Cache-Control": "no-store",
    },
  });
}
