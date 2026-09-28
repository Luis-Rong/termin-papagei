/**
 * Wann ist welche Erinnerung fällig — die einzige Stelle mit diesen Regeln.
 * Der Erinnerungs-Job verschickt danach, die Terminseite zeigt danach an,
 * was geplant ist. So können Anzeige und Automatik nicht auseinanderlaufen.
 *
 * Reine Rechenlogik: keine Abfragen, nichts vom Server.
 */

import { TERMINARTEN, type Terminart } from "@/lib/termine/terminarten";

export type ErinnerungsArt = "erinnerung_1tag" | "erinnerung_2std" | "anruf_erinnerung";

export const ERINNERUNGS_ARTEN: readonly ErinnerungsArt[] = [
  "erinnerung_1tag",
  "erinnerung_2std",
  "anruf_erinnerung",
];

export const ERINNERUNGS_LABEL: Record<ErinnerungsArt, string> = {
  erinnerung_1tag: "Erinnerung an den Kunden „1 Tag vorher“",
  erinnerung_2std: "Erinnerung an den Kunden „2 Std vorher“",
  anruf_erinnerung: "Erinnerung an dich, den Kunden anzurufen",
};

/** Laut Spezifikation: immer 1 Tag vor einem Umsetzung-Termin. */
const ANRUF_STUNDEN_VORHER = 24;

export type PlanTermin = {
  terminart: Terminart;
  status: string;
  beginn: string;
  /** Wann der Termin angelegt wurde — was davor fällig gewesen wäre, entfällt. */
  angelegtAm: string;
  kundeHatEmail: boolean;
  erinnerung1TagAktiv: boolean;
  erinnerung1TagStunden: number;
  erinnerung2StdAktiv: boolean;
  erinnerung2StdStunden: number;
};

export type ErinnerungsZustand =
  | { zustand: "aus" }
  | { zustand: "entfaellt"; grund: string }
  | { zustand: "geplant"; faellig: Date }
  | { zustand: "faellig"; faellig: Date }
  | { zustand: "verschickt"; am: string };

const STUNDE = 60 * 60 * 1000;

function faelligkeit(beginn: Date, stundenVorher: number): Date {
  return new Date(beginn.getTime() - stundenVorher * STUNDE);
}

/**
 * Der Zustand jeder Erinnerung eines Termins. `verschickt` enthält nur
 * Mails, die für den aktuellen Terminbeginn rausgingen (siehe
 * `email_log.termin_beginn`). Nicht zutreffende Arten (Anruf-Erinnerung
 * außerhalb von Umsetzung) fehlen im Ergebnis.
 */
export function erinnerungsPlan(
  termin: PlanTermin,
  verschickt: Partial<Record<ErinnerungsArt, string>>,
  jetzt: Date,
): Partial<Record<ErinnerungsArt, ErinnerungsZustand>> {
  const beginn = new Date(termin.beginn);
  const angelegt = new Date(termin.angelegtAm);
  const faellig2Std = faelligkeit(beginn, termin.erinnerung2StdStunden);

  function zustand(
    art: ErinnerungsArt,
    aktiv: boolean,
    stundenVorher: number,
    anKunden: boolean,
  ): ErinnerungsZustand {
    const am = verschickt[art];
    if (am) return { zustand: "verschickt", am };
    if (!aktiv) return { zustand: "aus" };
    if (termin.status !== "geplant") {
      return { zustand: "entfaellt", grund: "Der Termin ist nicht mehr geplant." };
    }
    if (anKunden && !termin.kundeHatEmail) {
      return { zustand: "entfaellt", grund: "Der Kunde hat keine E-Mail-Adresse." };
    }

    const faellig = faelligkeit(beginn, stundenVorher);
    if (faellig < angelegt) {
      return {
        zustand: "entfaellt",
        grund: "Der Termin wurde erst nach diesem Zeitpunkt angelegt.",
      };
    }
    if (jetzt >= beginn) {
      return { zustand: "entfaellt", grund: "Der Termin hat schon begonnen." };
    }
    // Zwei Erinnerungen kurz hintereinander nerven: Ist die 2-Std-Erinnerung
    // schon dran, braucht es die vom Vortag nicht mehr.
    if (
      art === "erinnerung_1tag" &&
      termin.erinnerung2StdAktiv &&
      jetzt >= faellig2Std &&
      faellig2Std >= angelegt
    ) {
      return {
        zustand: "entfaellt",
        grund: "Die Erinnerung „2 Std vorher“ ist schon dran — eine reicht.",
      };
    }
    return jetzt >= faellig ? { zustand: "faellig", faellig } : { zustand: "geplant", faellig };
  }

  const plan: Partial<Record<ErinnerungsArt, ErinnerungsZustand>> = {
    erinnerung_1tag: zustand(
      "erinnerung_1tag",
      termin.erinnerung1TagAktiv,
      termin.erinnerung1TagStunden,
      true,
    ),
    erinnerung_2std: zustand(
      "erinnerung_2std",
      termin.erinnerung2StdAktiv,
      termin.erinnerung2StdStunden,
      true,
    ),
  };

  if (TERMINARTEN[termin.terminart].anrufErinnerungAnVermittler) {
    plan.anruf_erinnerung = zustand("anruf_erinnerung", true, ANRUF_STUNDEN_VORHER, false);
  }

  return plan;
}

/** Größter Vorlauf, den eine Erinnerung haben kann — begrenzt die Abfrage des Jobs. */
export function laengsterVorlaufStunden(erinnerungStundenMax: number): number {
  return Math.max(erinnerungStundenMax, ANRUF_STUNDEN_VORHER);
}
