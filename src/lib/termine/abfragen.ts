import { partnerName, profileLaden } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";
import { bestaetigungsStand, type BestaetigungsStand } from "@/lib/termine/mail";
import { ZEITZONE } from "@/lib/zeit";
import { de } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { kundenName } from "@/lib/kunden/formular";
import {
  adresseZusammen,
  erinnerungAus,
  erinnerungenAusListe,
  type ErinnerungsEinstellung,
  type ErinnerungsModus,
  type Ort,
  type Terminart,
  type TerminStatus,
} from "@/lib/termine/terminarten";

/** Kunde, Partner oder Besitzer eines Termins — nur Id und Anzeigename. */
export type TerminPerson = { id: string; name: string };

export type Termin = {
  id: string;
  kind: "kundentermin" | "vorbereitung";
  terminart: Terminart | null;
  ort: Ort;
  /** Straße und PLZ/Ort — nur bei ort = "anderer". */
  ortStrasse: string | null;
  ortPlzOrt: string | null;
  /** Beides zusammen als eine Zeile, oder null. */
  ortAdresse: string | null;
  /** Bis zu drei Nutzen für den Betreff, in gewählter Reihenfolge. */
  nutzen: string[];
  /** ISO-Zeitpunkte; formatiert wird über src/lib/zeit.ts. */
  beginn: string;
  ende: string;
  notizen: string | null;
  status: TerminStatus;
  meetLink: string | null;
  /** Gesetzt, sobald der Termin im Google-Kalender steht. */
  googleEventId: string | null;
  parentId: string | null;
  /** true, wenn der Termin mir gehört; sonst bin ich nur beteiligter Partner. */
  eigener: boolean;
  kunde: TerminPerson | null;
  partner: TerminPerson | null;
  /** Nur gesetzt, wenn der Termin einem anderen Vermittler gehört. */
  besitzer: TerminPerson | null;
  /** Alle Kunden-Erinnerungen, Index 0 = 1. Erinnerung (2 bis 5 Stück). */
  erinnerungen: ErinnerungsEinstellung[];
  /** Entwurf der Bestätigungsmail (Phase 6) — unverschickt, bis aktiv "Senden" geklickt wird. */
  bestaetigungEntwurfHtml: string | null;
  /** Letzte Änderung am Entwurf — später als der letzte Versand heißt: Kunde kennt ihn noch nicht. */
  bestaetigungEntwurfAm: string | null;
  angelegtAm: string;
  /** Schlüssel im Zusage-Link der Bestätigungsmail. */
  zusageToken: string;
  /** Gesetzt, sobald der Kunde über den Link zugesagt hat. */
  kundeZugesagtAm: string | null;
};

// Muss ein einzelner Text bleiben (nicht zusammengesetzt): Sonst kann
// supabase-js die Spaltenliste nicht auswerten und liefert einen Fehlertyp.
const FELDER =
  "id, owner_id, customer_id, partner_id, parent_appointment_id, kind, appointment_type, location, ort_strasse, ort_plz_ort, nutzen, starts_at, ends_at, notes, status, meet_link, google_event_id, erinnerung_1tag_aktiv, erinnerung_1tag_stunden_vorher, erinnerung_1tag_modus, erinnerung_1tag_tage_vorher, erinnerung_1tag_uhrzeit, erinnerung_2std_aktiv, erinnerung_2std_stunden_vorher, erinnerung_2std_modus, erinnerung_2std_tage_vorher, erinnerung_2std_uhrzeit, erinnerungen_weitere, bestaetigung_entwurf_html, bestaetigung_entwurf_am, created_at, zusage_token, kunde_zugesagt_am";

type TerminZeile = {
  id: string;
  owner_id: string;
  customer_id: string | null;
  partner_id: string | null;
  parent_appointment_id: string | null;
  kind: "kundentermin" | "vorbereitung";
  appointment_type: Terminart | null;
  location: Ort;
  ort_strasse: string | null;
  ort_plz_ort: string | null;
  nutzen: string[] | null;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  status: TerminStatus;
  meet_link: string | null;
  google_event_id: string | null;
  erinnerung_1tag_aktiv: boolean;
  erinnerung_1tag_stunden_vorher: number;
  erinnerung_1tag_modus: ErinnerungsModus;
  erinnerung_1tag_tage_vorher: number;
  erinnerung_1tag_uhrzeit: string;
  erinnerung_2std_aktiv: boolean;
  erinnerung_2std_stunden_vorher: number;
  erinnerung_2std_modus: ErinnerungsModus;
  erinnerung_2std_tage_vorher: number;
  erinnerung_2std_uhrzeit: string;
  erinnerungen_weitere: unknown;
  bestaetigung_entwurf_html: string | null;
  bestaetigung_entwurf_am: string | null;
  created_at: string;
  zusage_token: string;
  kunde_zugesagt_am: string | null;
};

/** Alle Kunden-Erinnerungen einer Zeile: die zwei Spaltenpaare plus die Liste. */
export function erinnerungenAusZeile(zeile: {
  erinnerung_1tag_aktiv: boolean;
  erinnerung_1tag_modus: ErinnerungsModus;
  erinnerung_1tag_stunden_vorher: number;
  erinnerung_1tag_tage_vorher: number;
  erinnerung_1tag_uhrzeit: string;
  erinnerung_2std_aktiv: boolean;
  erinnerung_2std_modus: ErinnerungsModus;
  erinnerung_2std_stunden_vorher: number;
  erinnerung_2std_tage_vorher: number;
  erinnerung_2std_uhrzeit: string;
  erinnerungen_weitere: unknown;
}): ErinnerungsEinstellung[] {
  return [
    erinnerungAus(
      zeile.erinnerung_1tag_aktiv,
      zeile.erinnerung_1tag_modus,
      zeile.erinnerung_1tag_stunden_vorher,
      zeile.erinnerung_1tag_tage_vorher,
      zeile.erinnerung_1tag_uhrzeit,
    ),
    erinnerungAus(
      zeile.erinnerung_2std_aktiv,
      zeile.erinnerung_2std_modus,
      zeile.erinnerung_2std_stunden_vorher,
      zeile.erinnerung_2std_tage_vorher,
      zeile.erinnerung_2std_uhrzeit,
    ),
    ...erinnerungenAusListe(zeile.erinnerungen_weitere),
  ];
}

/**
 * Setzt die Namen zu den Ids der Termine zusammen.
 *
 * Kunden und Profile kommen über eigene Abfragen statt über eine Verknüpfung:
 * `appointments` zeigt zweimal auf `profiles` (Besitzer und Partner), was in
 * PostgREST nur über Fremdschlüsselnamen auflösbar wäre. Bei rund 20 Nutzern
 * ist die einfache Variante genauso schnell und besser zu lesen.
 */
async function zeilenAufbereiten(
  zeilen: TerminZeile[],
  userId: string,
): Promise<Termin[]> {
  const supabase = await createClient();

  const kundenIds = [
    ...new Set(zeilen.map((z) => z.customer_id).filter((id) => id !== null)),
  ];

  const [{ data: kunden }, profile] = await Promise.all([
    kundenIds.length > 0
      ? supabase
          .from("customers")
          .select("id, first_name, last_name")
          .in("id", kundenIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null }[] }),
    profileLaden(zeilen.flatMap((z) => [z.owner_id, z.partner_id])),
  ]);

  const kundeNachId = new Map(
    (kunden ?? []).map((k) => [
      k.id,
      { id: k.id, name: kundenName(k.first_name, k.last_name) },
    ]),
  );

  function person(id: string | null): TerminPerson | null {
    if (!id) return null;
    const profil = profile.get(id);
    return profil ? { id, name: partnerName(profil) } : null;
  }

  return zeilen.map((zeile) => ({
    id: zeile.id,
    kind: zeile.kind,
    terminart: zeile.appointment_type,
    ort: zeile.location,
    ortStrasse: zeile.ort_strasse,
    ortPlzOrt: zeile.ort_plz_ort,
    ortAdresse: adresseZusammen(zeile.ort_strasse, zeile.ort_plz_ort),
    nutzen: zeile.nutzen ?? [],
    beginn: zeile.starts_at,
    ende: zeile.ends_at,
    notizen: zeile.notes,
    status: zeile.status,
    meetLink: zeile.meet_link,
    googleEventId: zeile.google_event_id,
    parentId: zeile.parent_appointment_id,
    eigener: zeile.owner_id === userId,
    kunde: zeile.customer_id
      ? (kundeNachId.get(zeile.customer_id) ?? null)
      : null,
    partner: person(zeile.partner_id),
    besitzer: zeile.owner_id === userId ? null : person(zeile.owner_id),
    erinnerungen: erinnerungenAusZeile(zeile),
    bestaetigungEntwurfHtml: zeile.bestaetigung_entwurf_html,
    bestaetigungEntwurfAm: zeile.bestaetigung_entwurf_am,
    angelegtAm: zeile.created_at,
    zusageToken: zeile.zusage_token,
    kundeZugesagtAm: zeile.kunde_zugesagt_am,
  }));
}

/**
 * Alle Termine, an denen ich beteiligt bin — eigene und die, bei denen ich als
 * Vertriebspartner eingetragen bin.
 */
export async function termineLaden(
  userId: string,
): Promise<{ termine: Termin[]; fehler?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(FELDER)
    .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
    .order("starts_at");

  if (error) return { termine: [], fehler: error.message };
  if (!data || data.length === 0) return { termine: [] };

  return { termine: await zeilenAufbereiten(data as TerminZeile[], userId) };
}

/** Ein einzelner Termin — oder null, wenn er nicht existiert oder nicht meiner ist. */
export async function terminLaden(
  userId: string,
  id: string,
): Promise<Termin | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("appointments")
    .select(FELDER)
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const [termin] = await zeilenAufbereiten([data as TerminZeile], userId);
  return termin ?? null;
}

/**
 * Trennt in kommende und vergangene Termine.
 *
 * Die Zeitabfrage steht bewusst hier und nicht in der Seite: In einer React-
 * Komponente gilt `Date.now()` als unrein und wird vom Linter beanstandet.
 * Vergangene Termine kommen mit den jüngsten zuerst — die braucht man am ehesten.
 */
export function aufteilenNachZeit(termine: Termin[]): {
  kommende: Termin[];
  vergangene: Termin[];
} {
  const jetzt = Date.now();
  const vorbei = (termin: Termin) => new Date(termin.ende).getTime() < jetzt;

  return {
    kommende: termine.filter((termin) => !vorbei(termin)),
    vergangene: termine.filter(vorbei).reverse(),
  };
}

/**
 * Termine nach Kalendertag (Berlin) gruppiert, mit Titel „Heute", „Morgen"
 * oder dem Wochentag. Steht hier und nicht in der Seite, weil `Date.now()`
 * in einer React-Komponente als unrein gilt.
 */
export function nachTagenGruppieren(
  termine: Termin[],
): { tag: string; titel: string; termine: Termin[] }[] {
  const heute = formatInTimeZone(new Date(), ZEITZONE, "yyyy-MM-dd");
  const morgen = formatInTimeZone(new Date(Date.now() + 86_400_000), ZEITZONE, "yyyy-MM-dd");
  const gruppen = new Map<string, Termin[]>();
  for (const termin of termine) {
    const tag = formatInTimeZone(termin.beginn, ZEITZONE, "yyyy-MM-dd");
    gruppen.set(tag, [...(gruppen.get(tag) ?? []), termin]);
  }
  return [...gruppen.entries()].map(([tag, eintraege]) => ({
    tag,
    titel:
      tag === heute
        ? "Heute"
        : tag === morgen
          ? "Morgen"
          : formatInTimeZone(eintraege[0].beginn, ZEITZONE, "EEEE", { locale: de }),
    termine: eintraege,
  }));
}

/** Wie viele der Termine in den nächsten `tage` Tagen beginnen. */
export function anzahlNaechsteTage(termine: Termin[], tage: number): number {
  const grenze = Date.now() + tage * 24 * 60 * 60 * 1000;
  return termine.filter((termin) => new Date(termin.beginn).getTime() <= grenze)
    .length;
}

/** Die Vorbereitungstermine, die an einem Kundentermin hängen. */
export async function vorbereitungenLaden(
  userId: string,
  terminId: string,
): Promise<Termin[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("appointments")
    .select(FELDER)
    .eq("parent_appointment_id", terminId)
    .order("starts_at");

  if (!data || data.length === 0) return [];

  return zeilenAufbereiten(data as TerminZeile[], userId);
}

/**
 * Bei welchen kommenden eigenen Terminen die Bestätigung noch nicht (oder
 * nach einer Änderung nicht erneut) beim Kunden ist. Terminliste und
 * Übersicht zeigen dasselbe Schild, deshalb steht die Abfrage hier.
 */
export async function bestaetigungsStaendeLaden(
  termine: Termin[],
): Promise<Map<string, BestaetigungsStand>> {
  const offenPruefen = termine.filter(
    (termin) =>
      termin.eigener && termin.status === "geplant" && termin.bestaetigungEntwurfHtml,
  );
  if (offenPruefen.length === 0) return new Map();

  const supabase = await createClient();
  const { data: versandLog } = await supabase
    .from("email_log")
    .select("appointment_id, sent_at")
    .eq("purpose", "bestaetigung")
    .is("error", null)
    .in(
      "appointment_id",
      offenPruefen.map((termin) => termin.id),
    );

  const letzterVersand = new Map<string, string>();
  for (const eintrag of versandLog ?? []) {
    const bisher = letzterVersand.get(eintrag.appointment_id);
    if (!bisher || eintrag.sent_at > bisher) {
      letzterVersand.set(eintrag.appointment_id, eintrag.sent_at);
    }
  }

  return new Map(
    offenPruefen.map((termin) => [
      termin.id,
      bestaetigungsStand(
        true,
        termin.bestaetigungEntwurfAm,
        letzterVersand.get(termin.id) ?? null,
      ),
    ]),
  );
}
