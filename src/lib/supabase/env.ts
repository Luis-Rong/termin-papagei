/**
 * Liest die Supabase-Zugangsdaten aus der Umgebung und erklärt im Fehlerfall
 * verständlich, was zu tun ist — statt einer kryptischen Fehlermeldung.
 */
function read(name: string): string {
  const value = process.env[name];

  if (!value || value.startsWith("HIER_")) {
    throw new Error(
      `Die Umgebungsvariable ${name} fehlt. Bitte in der Datei .env.local eintragen ` +
        `(Vorlage: .env.example, Werte im Supabase-Dashboard unter Settings → API Keys) ` +
        `und danach den Entwicklungsserver neu starten.`,
    );
  }

  return value;
}

export function supabaseUrl(): string {
  // Die Projekt-URL endet auf .supabase.co — ein versehentlich mitkopierter
  // Pfad wie /rest/v1/ würde sonst alle Anfragen ins Leere laufen lassen.
  return read("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

export function supabasePublishableKey(): string {
  return read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}
