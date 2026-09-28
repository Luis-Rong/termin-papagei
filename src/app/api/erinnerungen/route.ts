import { createHash, timingSafeEqual } from "node:crypto";

import { erinnerungenVerschicken } from "@/lib/erinnerungen";

/**
 * Einstieg für den Erinnerungs-Job. Aufgerufen alle 15 Minuten von pg_cron
 * (0013_erinnerungen_cron.sql) mit `Authorization: Bearer <ERINNERUNG_GEHEIMNIS>`.
 * Ohne passendes Geheimnis passiert nichts — sonst könnte jeder im Internet
 * Mails an Kunden auslösen.
 */

// Genug Zeit für einen Durchgang mit vielen Mails; Vercel bricht sonst früher ab.
export const maxDuration = 60;

function geheimnisPasst(angegeben: string | null, erwartet: string): boolean {
  if (!angegeben) return false;
  // Über Hashes vergleichen: gleiche Länge, und die Laufzeit verrät nichts.
  const a = createHash("sha256").update(angegeben).digest();
  const b = createHash("sha256").update(`Bearer ${erwartet}`).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const geheimnis = process.env.ERINNERUNG_GEHEIMNIS?.trim();
  if (!geheimnis) {
    return Response.json(
      { fehler: "ERINNERUNG_GEHEIMNIS ist nicht gesetzt." },
      { status: 503 },
    );
  }
  if (!geheimnisPasst(request.headers.get("authorization"), geheimnis)) {
    return Response.json({ fehler: "Nicht berechtigt." }, { status: 401 });
  }

  // Nur lokal: `?jetzt=2026-09-29T06:05:00+02:00` spielt einen anderen
  // Zeitpunkt durch, statt bis dahin zu warten. In Produktion ignoriert.
  const url = new URL(request.url);
  const testzeit = process.env.NODE_ENV !== "production" ? url.searchParams.get("jetzt") : null;
  const jetzt = testzeit ? new Date(testzeit) : new Date();
  if (Number.isNaN(jetzt.getTime())) {
    return Response.json({ fehler: "Ungültiger Wert für ?jetzt=" }, { status: 400 });
  }

  try {
    const bericht = await erinnerungenVerschicken(url.origin, jetzt);
    return Response.json(bericht, { status: bericht.fehler.length > 0 ? 207 : 200 });
  } catch (fehler) {
    return Response.json(
      { fehler: fehler instanceof Error ? fehler.message : "Unbekannter Fehler" },
      { status: 500 },
    );
  }
}
