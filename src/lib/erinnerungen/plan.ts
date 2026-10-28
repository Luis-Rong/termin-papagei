/**
 * Wann ist welche Erinnerung fällig — die einzige Stelle mit diesen Regeln.
 * Der Erinnerungs-Job verschickt danach, die Terminseite zeigt danach an,
 * was geplant ist. So können Anzeige und Automatik nicht auseinanderlaufen.
 *
 * Reine Rechenlogik: keine Abfragen, nichts vom Server.
 */

import {
  ERINNERUNGEN_MAX,
  TERMINARTEN,
  type ErinnerungsEinstellung,
  type Terminart,
} from "@/lib/termine/terminarten";
import type { Zweck } from "@/lib/vorlagen/typen";
import { zeitpunktAmTag } from "@/lib/zeit";

export type ErinnerungsArt =
  | "erinnerung_1tag"
  | "erinnerung_2std"
  | "erinnerung_3"
  | "erinnerung_4"
  | "erinnerung_5"
  | "anruf_erinnerung";

/** Die Kunden-Erinnerungen in Reihenfolge: Index 0 = 1. Erinnerung. */
export const KUNDEN_ERINNERUNGEN: readonly ErinnerungsArt[] = [
  "erinnerung_1tag",
  "erinnerung_2std",
  "erinnerung_3",
  "erinnerung_4",
  "erinnerung_5",
];

export const ERINNERUNGS_ARTEN: readonly ErinnerungsArt[] = [
  ...KUNDEN_ERINNERUNGEN,
  "anruf_erinnerung",
];

export function erinnerungsLabel(art: ErinnerungsArt): string {
  if (art === "anruf_erinnerung") return "Erinnerung an dich, den Kunden anzurufen";
  return `${KUNDEN_ERINNERUNGEN.indexOf(art) + 1}. Erinnerung an den Kunden`;
}

/**
 * Welche Vorlage eine Erinnerung nutzt: Die zweite ist die „kurz vorher"-Mail,
 * alle anderen (1., 3., 4., 5.) nutzen den Text der 1. Erinnerung.
 */
export function vorlagenZweckFuer(art: ErinnerungsArt): Zweck {
  return art === "erinnerung_2std" ? "erinnerung_2std" : "erinnerung_1tag";
}

/** Laut Spezifikation: immer 1 Tag vor einem Umsetzung-Termin. */
const ANRUF_STUNDEN_VORHER = 24;

export type PlanTermin = {
  terminart: Terminart;
  status: string;
  beginn: string;
  /** Wann der Termin angelegt wurde — was davor fällig gewesen wäre, entfällt. */
  angelegtAm: string;
  kundeHatEmail: boolean;
  /** Alle Kunden-Erinnerungen, Index 0 = 1. Erinnerung; höchstens ERINNERUNGEN_MAX. */
  erinnerungen: ErinnerungsEinstellung[];
};

export type ErinnerungsZustand =
  | { zustand: "aus" }
  | { zustand: "entfaellt"; grund: string }
  | { zustand: "geplant"; faellig: Date }
  | { zustand: "faellig"; faellig: Date }
  | { zustand: "verschickt"; am: string };

const STUNDE = 60 * 60 * 1000;

/** Wann eine Erinnerung rausgeht — je nach Modus Vorlauf oder feste Uhrzeit. */
export function faelligkeit(beginn: Date, einstellung: ErinnerungsEinstellung): Date {
  if (einstellung.modus === "uhrzeit") {
    return zeitpunktAmTag(beginn, einstellung.tage, einstellung.uhrzeit);
  }
  return new Date(beginn.getTime() - einstellung.stunden * STUNDE);
}

/**
 * Der Zustand jeder Erinnerung eines Termins. `verschickt` enthält nur
 * Mails, die für den aktuellen Terminbeginn rausgingen (siehe
 * `email_log.termin_beginn`). Nicht zutreffende Arten (Anruf-Erinnerung
 * außerhalb von Umsetzung, nicht angelegte Erinnerungen) fehlen im Ergebnis.
 */
export function erinnerungsPlan(
  termin: PlanTermin,
  verschickt: Partial<Record<ErinnerungsArt, string>>,
  jetzt: Date,
): Partial<Record<ErinnerungsArt, ErinnerungsZustand>> {
  const beginn = new Date(termin.beginn);
  const angelegt = new Date(termin.angelegtAm);
  const kunden = termin.erinnerungen.slice(0, ERINNERUNGEN_MAX);
  const faellige = kunden.map((e) => faelligkeit(beginn, e));

  function zustand(
    art: ErinnerungsArt,
    aktiv: boolean,
    faellig: Date,
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
    if (faellig >= beginn) {
      return { zustand: "entfaellt", grund: "Der Zeitpunkt liegt nach dem Terminbeginn." };
    }
    if (faellig < angelegt) {
      return {
        zustand: "entfaellt",
        grund: "Der Termin wurde erst nach diesem Zeitpunkt angelegt.",
      };
    }
    if (jetzt >= beginn) {
      return { zustand: "entfaellt", grund: "Der Termin hat schon begonnen." };
    }
    // Zwei Erinnerungen kurz hintereinander nerven: Ist eine spätere schon
    // dran, braucht es die frühere nicht mehr.
    if (anKunden) {
      const spaetereDran = kunden.some(
        (andere, j) =>
          andere.aktiv &&
          faellige[j] > faellig &&
          faellige[j] < beginn &&
          faellige[j] >= angelegt &&
          jetzt >= faellige[j],
      );
      if (spaetereDran) {
        return { zustand: "entfaellt", grund: "Eine spätere Erinnerung ist schon dran — eine reicht." };
      }
    }
    return jetzt >= faellig ? { zustand: "faellig", faellig } : { zustand: "geplant", faellig };
  }

  const plan: Partial<Record<ErinnerungsArt, ErinnerungsZustand>> = {};
  kunden.forEach((e, i) => {
    plan[KUNDEN_ERINNERUNGEN[i]] = zustand(KUNDEN_ERINNERUNGEN[i], e.aktiv, faellige[i], true);
  });

  if (TERMINARTEN[termin.terminart].anrufErinnerungAnVermittler) {
    plan.anruf_erinnerung = zustand(
      "anruf_erinnerung",
      true,
      new Date(beginn.getTime() - ANRUF_STUNDEN_VORHER * STUNDE),
      false,
    );
  }

  return plan;
}

/** Größter Vorlauf, den eine Erinnerung haben kann — begrenzt die Abfrage des Jobs. */
export function laengsterVorlaufStunden(erinnerungStundenMax: number): number {
  return Math.max(erinnerungStundenMax, ANRUF_STUNDEN_VORHER);
}
