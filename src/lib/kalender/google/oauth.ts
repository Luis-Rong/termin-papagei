/**
 * Der Anmelde-Teil der Google-Anbindung: einmal Zustimmung einholen, danach
 * den Refresh-Token gegen kurzlebige Zugriffs-Token eintauschen.
 *
 * Bewusst ohne die Bibliothek `googleapis`: Gebraucht werden vier
 * HTTP-Aufrufe, dafür lohnt kein Paket, das ein Vielfaches der Anwendung wiegt
 * und den Build auf Vercel aufbläht. Der Ort bleibt derselbe — alles
 * Google-Spezifische liegt hier unter `src/lib/kalender/google/`.
 */

const ANMELDE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const RUECKZUG_URL = "https://oauth2.googleapis.com/revoke";

/**
 * So wenig Rechte wie möglich: Termine schreiben (nicht den ganzen Kalender
 * lesen) und die verbundene Adresse erfahren, damit man in den Einstellungen
 * sieht, welches Konto hängt.
 */
export const BERECHTIGUNGEN = [
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** Ohne diese beiden Werte gibt es keine Google-Verbindung — dann bleibt die Karte in den Einstellungen ausgegraut. */
export function googleEingerichtet(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

function zugangsdaten(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID und GOOGLE_CLIENT_SECRET fehlen in .env.local. " +
        "Die Werte stehen in der Google Cloud Console unter APIs & Dienste → Anmeldedaten " +
        "(Anleitung in der README).",
    );
  }

  return { clientId, clientSecret };
}

/**
 * Die Adresse, zu der Google nach der Zustimmung zurückschickt. Muss in der
 * Google Cloud Console Zeichen für Zeichen so eingetragen sein — sowohl für
 * localhost als auch später für die echte Domain.
 */
export function rueckkehrAdresse(origin: string): string {
  return new URL("/google/verbunden", origin).toString();
}

/** Die Seite, auf der Google nach der Zustimmung fragt. */
export function anmeldeUrl(rueckkehr: string, state: string): string {
  const { clientId } = zugangsdaten();

  const felder = new URLSearchParams({
    client_id: clientId,
    redirect_uri: rueckkehr,
    response_type: "code",
    scope: BERECHTIGUNGEN.join(" "),
    // Ohne access_type=offline gibt es keinen Refresh-Token und der Zugang
    // wäre nach einer Stunde vorbei.
    access_type: "offline",
    // Erzwingt den Zustimmungsbildschirm. Ohne das liefert Google beim zweiten
    // Verbinden keinen Refresh-Token mehr — und der ist genau das, was gebraucht wird.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `${ANMELDE_URL}?${felder}`;
}

type TokenAntwort = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

async function tokenAnfrage(felder: Record<string, string>): Promise<TokenAntwort> {
  const antwort = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(felder),
    cache: "no-store",
  });

  return (await antwort.json()) as TokenAntwort;
}

/**
 * Liest die E-Mail-Adresse aus dem ID-Token.
 *
 * Die Signatur wird nicht geprüft, und das ist hier richtig so: Das Token kommt
 * direkt aus der Antwort von Google über TLS, es hat also niemand dazwischen
 * daran gedreht. (Google beschreibt genau diesen Fall in seiner Dokumentation.)
 */
function adresseAusIdToken(idToken: string | undefined): string | null {
  const inhalt = idToken?.split(".")[1];
  if (!inhalt) return null;

  try {
    const daten = JSON.parse(Buffer.from(inhalt, "base64url").toString("utf8"));
    return typeof daten.email === "string" ? daten.email : null;
  } catch {
    return null;
  }
}

export type NeueVerbindung = {
  refreshToken: string;
  googleEmail: string;
  scopes: string;
};

/** Schritt nach der Zustimmung: den einmaligen Code gegen den Refresh-Token tauschen. */
export async function verbindungAusCode(
  code: string,
  rueckkehr: string,
): Promise<NeueVerbindung | { fehler: string }> {
  const { clientId, clientSecret } = zugangsdaten();

  const antwort = await tokenAnfrage({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: rueckkehr,
    grant_type: "authorization_code",
  });

  if (antwort.error || !antwort.refresh_token) {
    // Kein Refresh-Token trotz erfolgreichem Tausch: Das passiert, wenn Google
    // die Zustimmung schon kannte. prompt=consent verhindert es normalerweise.
    return {
      fehler:
        antwort.error_description ??
        antwort.error ??
        "Google hat keinen dauerhaften Zugang zurückgegeben. Bitte noch einmal versuchen.",
    };
  }

  const googleEmail = adresseAusIdToken(antwort.id_token);
  if (!googleEmail) {
    return {
      fehler:
        "Google hat die verbundene E-Mail-Adresse nicht mitgeschickt. Bitte noch einmal versuchen.",
    };
  }

  return {
    refreshToken: antwort.refresh_token,
    googleEmail,
    scopes: antwort.scope ?? "",
  };
}

/**
 * Frischer Zugriffs-Token für einen einzelnen Aufruf. Er gilt eine Stunde und
 * wird bewusst nicht zwischengespeichert: Bei rund 20 Nutzern und ein paar
 * Terminen am Tag ist das ein Aufruf mehr — und keine Zeile Ablauflogik.
 *
 * `entzogen` heißt: Der Nutzer hat den Zugriff bei Google zurückgenommen oder
 * das Passwort geändert. Dann hilft nur neu verbinden.
 */
export async function zugriffsToken(
  refreshToken: string,
): Promise<{ accessToken: string } | { fehler: string; entzogen: boolean }> {
  const { clientId, clientSecret } = zugangsdaten();

  const antwort = await tokenAnfrage({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  if (antwort.access_token) return { accessToken: antwort.access_token };

  return {
    fehler:
      antwort.error_description ?? antwort.error ?? "Unbekannter Fehler bei Google.",
    entzogen: antwort.error === "invalid_grant",
  };
}

/**
 * Beim Trennen auch bei Google abmelden, nicht nur bei uns löschen — sonst
 * bleibt die Anwendung im Google-Konto als berechtigt stehen.
 * Fehler sind hier egal: Der Token wird ohnehin gleich gelöscht.
 */
export async function verbindungZurueckziehen(refreshToken: string): Promise<void> {
  try {
    await fetch(RUECKZUG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
      cache: "no-store",
    });
  } catch {
    // Absicht: siehe oben.
  }
}
