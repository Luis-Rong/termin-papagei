import { partnerName, profileLaden } from "@/lib/partner/abfragen";
import { createClient } from "@/lib/supabase/server";
import type { Ort, Terminart, TerminStatus } from "@/lib/termine/terminarten";

/** Kunde, Partner oder Besitzer eines Termins — nur Id und Anzeigename. */
export type TerminPerson = { id: string; name: string };

export type Termin = {
  id: string;
  kind: "kundentermin" | "vorbereitung";
  terminart: Terminart | null;
  ort: Ort;
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
  erinnerung1TagAktiv: boolean;
  erinnerung1TagStunden: number;
  erinnerung2StdAktiv: boolean;
  erinnerung2StdStunden: number;
};

// Muss ein einzelner Text bleiben (nicht zusammengesetzt): Sonst kann
// supabase-js die Spaltenliste nicht auswerten und liefert einen Fehlertyp.
const FELDER =
  "id, owner_id, customer_id, partner_id, parent_appointment_id, kind, appointment_type, location, starts_at, ends_at, notes, status, meet_link, google_event_id, erinnerung_1tag_aktiv, erinnerung_1tag_stunden_vorher, erinnerung_2std_aktiv, erinnerung_2std_stunden_vorher";

type TerminZeile = {
  id: string;
  owner_id: string;
  customer_id: string | null;
  partner_id: string | null;
  parent_appointment_id: string | null;
  kind: "kundentermin" | "vorbereitung";
  appointment_type: Terminart | null;
  location: Ort;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  status: TerminStatus;
  meet_link: string | null;
  google_event_id: string | null;
  erinnerung_1tag_aktiv: boolean;
  erinnerung_1tag_stunden_vorher: number;
  erinnerung_2std_aktiv: boolean;
  erinnerung_2std_stunden_vorher: number;
};

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
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
    profileLaden(zeilen.flatMap((z) => [z.owner_id, z.partner_id])),
  ]);

  const kundeNachId = new Map(
    (kunden ?? []).map((k) => [
      k.id,
      { id: k.id, name: `${k.first_name} ${k.last_name}`.trim() },
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
    erinnerung1TagAktiv: zeile.erinnerung_1tag_aktiv,
    erinnerung1TagStunden: zeile.erinnerung_1tag_stunden_vorher,
    erinnerung2StdAktiv: zeile.erinnerung_2std_aktiv,
    erinnerung2StdStunden: zeile.erinnerung_2std_stunden_vorher,
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
