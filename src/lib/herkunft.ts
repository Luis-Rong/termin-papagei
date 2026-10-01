import { headers } from "next/headers";

/** Die Adresse, unter der die laufende Anfrage ankam — z. B. für Links in Mails. */
export async function anfrageHerkunft(): Promise<string> {
  const kopfzeilen = await headers();
  const host = kopfzeilen.get("host") ?? "localhost:3000";
  const protokoll = /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https";
  return `${protokoll}://${host}`;
}
