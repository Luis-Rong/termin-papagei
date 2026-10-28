/**
 * Die Kundenfelder, wie sie aus einem Formular kommen — geteilt zwischen dem
 * Kundenformular und dem Terminformular, das einen neuen Kunden gleich mit
 * anlegen kann. Reine Prüf- und Umwandlungslogik, keine Abfragen.
 */

import { EIGENER_KUNDE } from "@/lib/partner/typen";
import {
  type Anrede,
  type AnredeTitel,
  istAnrede,
  istAnredeTitel,
} from "@/lib/vorlagen/typen";

/** Die Formularfelder so, wie sie im Browser stehen. */
export type KundenWerte = {
  vorname: string;
  nachname: string;
  telefon: string;
  email: string;
  /** "du" oder "sie". */
  anrede: string;
  /** "herr" oder "frau" — nur beim Sie. */
  anredeTitel: string;
  /** Id des Vertriebspartners oder `EIGENER_KUNDE`. */
  partner: string;
};

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** Liest die Kundenfelder; mit `praefix` („neu") aus dem Terminformular. */
export function kundenWerteLesen(formData: FormData, praefix = ""): KundenWerte {
  const feld = (name: string) =>
    praefix ? `${praefix}${name[0].toUpperCase()}${name.slice(1)}` : name;
  return {
    vorname: text(formData, feld("vorname")),
    nachname: text(formData, feld("nachname")),
    telefon: text(formData, feld("telefon")),
    email: text(formData, feld("email")),
    anrede: text(formData, feld("anrede")) || "du",
    anredeTitel: text(formData, feld("anredeTitel")),
    partner: text(formData, feld("partner")) || EIGENER_KUNDE,
  };
}

/** „Max Mustermann", „Max" oder „Mustermann" — je nachdem, was da ist. */
export function kundenName(vorname: string | null | undefined, nachname: string | null | undefined): string {
  return [vorname, nachname].map((t) => t?.trim()).filter(Boolean).join(" ");
}

/**
 * Gibt einen Fehlertext für den Nutzer zurück — oder null, wenn alles passt.
 * Vor- oder Nachname reicht: Mit nur Vornamen geht nur Du (die Mail sagt
 * „Hallo Max"), mit nur Nachnamen nur Sie („Guten Tag Frau Mustermann").
 */
export function kundenPruefen(werte: KundenWerte): string | null {
  if (!werte.vorname && !werte.nachname) {
    return "Bitte mindestens Vor- oder Nachnamen eingeben.";
  }
  if (werte.anrede === "du" && !werte.vorname) {
    return "Per Du braucht es den Vornamen — oder auf Sie umstellen.";
  }
  if (werte.anrede === "sie" && !werte.nachname) {
    return "Per Sie braucht es den Nachnamen — oder auf Du umstellen.";
  }
  if (!werte.telefon && !werte.email) {
    return "Bitte eine E-Mail-Adresse oder eine Telefonnummer eintragen.";
  }
  if (werte.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(werte.email)) {
    return "Die E-Mail-Adresse sieht nicht richtig aus.";
  }
  if (!istAnrede(werte.anrede)) return "Bitte Du oder Sie wählen.";
  if (werte.anrede === "sie" && !istAnredeTitel(werte.anredeTitel)) {
    return "Beim Sie bitte Herr oder Frau wählen.";
  }
  return null;
}

/** Die Zeile für `customers` — ohne owner_id, die setzt der Aufrufer. */
export function kundenDatensatz(werte: KundenWerte, sourcePartnerId: string | null) {
  const anrede = (istAnrede(werte.anrede) ? werte.anrede : "du") as Anrede;
  const anredeTitel =
    anrede === "sie" && istAnredeTitel(werte.anredeTitel)
      ? (werte.anredeTitel as AnredeTitel)
      : null;
  return {
    first_name: werte.vorname || null,
    last_name: werte.nachname || null,
    phone: werte.telefon || null,
    email: werte.email || null,
    anrede,
    anrede_titel: anredeTitel,
    source_partner_id: sourcePartnerId,
  };
}
