import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Der Refresh-Token von Google ist ein Dauerzugang zum Kalender eines
 * Vermittlers. Er wird deshalb verschlüsselt gespeichert: Wer später einmal
 * einen Datenbank-Export in die Hand bekommt, hält damit noch keinen
 * Kalenderzugang in der Hand.
 *
 * Verfahren: AES-256-GCM. GCM erkennt nachträgliche Veränderungen am
 * Geheimtext — das Entschlüsseln schlägt dann fehl, statt Unsinn zu liefern.
 */
const VERFAHREN = "aes-256-gcm";

/** Empfohlene Länge für den Zufallswert bei GCM. */
const IV_LAENGE = 12;

function schluessel(): Buffer {
  const wert = process.env.KALENDER_TOKEN_SCHLUESSEL;

  if (!wert) {
    throw new Error(
      "Die Umgebungsvariable KALENDER_TOKEN_SCHLUESSEL fehlt. Einen neuen Schlüssel " +
        'erzeugst du mit: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))" ' +
        "— den Wert in .env.local eintragen und den Entwicklungsserver neu starten.",
    );
  }

  const roh = Buffer.from(wert, "base64");
  if (roh.length !== 32) {
    throw new Error(
      "KALENDER_TOKEN_SCHLUESSEL muss 32 zufällige Bytes als Base64 enthalten " +
        `(aktuell sind es ${roh.length}). Bitte neu erzeugen — Achtung: Danach lassen ` +
        "sich bestehende Kalender-Verbindungen nicht mehr lesen und müssen neu hergestellt werden.",
    );
  }

  return roh;
}

/** Ergibt "iv:tag:geheimtext", alles Base64. */
export function verschluesseln(klartext: string): string {
  const iv = randomBytes(IV_LAENGE);
  const cipher = createCipheriv(VERFAHREN, schluessel(), iv);
  const geheim = Buffer.concat([cipher.update(klartext, "utf8"), cipher.final()]);

  return [iv, cipher.getAuthTag(), geheim]
    .map((teil) => teil.toString("base64"))
    .join(":");
}

/** Gegenstück; wirft, wenn der Schlüssel nicht passt oder etwas verändert wurde. */
export function entschluesseln(gespeichert: string): string {
  const teile = gespeichert.split(":");
  if (teile.length !== 3) {
    throw new Error("Der gespeicherte Token hat ein unbekanntes Format.");
  }

  const [iv, tag, geheim] = teile.map((teil) => Buffer.from(teil, "base64"));
  const decipher = createDecipheriv(VERFAHREN, schluessel(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(geheim), decipher.final()]).toString(
    "utf8",
  );
}
