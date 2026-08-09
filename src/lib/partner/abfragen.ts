import type {
  PartnerDaten,
  PartnerProfil,
  Partnerschaft,
  ProfilZeile,
} from "@/lib/partner/typen";
import { createClient } from "@/lib/supabase/server";

/** Felder, die ein Vermittler-Profil für Suche und Freundesliste liefert. */
export const PROFIL_FELDER = "id, first_name, last_name, company, email";

export function alsPartnerProfil(zeile: ProfilZeile): PartnerProfil {
  return {
    id: zeile.id,
    vorname: zeile.first_name,
    nachname: zeile.last_name,
    firma: zeile.company,
    email: zeile.email,
  };
}

/** „Max Mustermann" — oder die E-Mail, falls im Profil noch kein Name steht. */
export function partnerName(profil: PartnerProfil): string {
  return `${profil.vorname} ${profil.nachname}`.trim() || profil.email;
}

/**
 * Ids aus Formularen landen in PostgREST-Filtern wie `.or(...)`. Dort trennen
 * Kommas und Klammern die Bedingungen — deshalb wird vorher geprüft, dass
 * wirklich nur eine UUID ankommt.
 */
export function istUuid(wert: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    wert,
  );
}

/**
 * Holt die Profile zu einer Liste von Ids. Angemeldete Nutzer dürfen alle
 * Profile lesen — deshalb funktioniert das auch für einen ehemaligen Partner,
 * der noch bei einem Kunden hinterlegt ist.
 */
export async function profileLaden(
  ids: (string | null)[],
): Promise<Map<string, PartnerProfil>> {
  const eindeutig = [
    ...new Set(ids.filter((id): id is string => id !== null && istUuid(id))),
  ];
  if (eindeutig.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFIL_FELDER)
    .in("id", eindeutig);

  return new Map((data ?? []).map((zeile) => [zeile.id, alsPartnerProfil(zeile)]));
}

function leer(): PartnerDaten {
  return { partner: [], eingehend: [], ausgehend: [] };
}

function nachNamen(a: Partnerschaft, b: Partnerschaft): number {
  return partnerName(a.partner).localeCompare(partnerName(b.partner), "de");
}

/**
 * Lädt alle Partnerschaften des angemeldeten Vermittlers und sortiert sie in
 * Freundesliste, eingehende und gesendete Anfragen.
 *
 * Die Namen kommen bewusst über eine zweite Abfrage auf `profiles`: Die Tabelle
 * `partnerships` zeigt zweimal auf `profiles`, und eine solche Verknüpfung
 * müsste man in PostgREST über den Namen des Fremdschlüssels auflösen. Zwei
 * einfache Abfragen sind bei rund 20 Nutzern genauso schnell und deutlich
 * leichter zu lesen.
 */
export async function partnerDatenLaden(userId: string): Promise<PartnerDaten> {
  const supabase = await createClient();

  const { data: eintraege, error } = await supabase
    .from("partnerships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) return { ...leer(), fehler: error.message };
  if (!eintraege || eintraege.length === 0) return leer();

  // Zu jedem Eintrag die jeweils andere Person.
  const gegenueber = new Map(
    eintraege.map((eintrag) => [
      eintrag.id,
      eintrag.requester_id === userId ? eintrag.addressee_id : eintrag.requester_id,
    ]),
  );

  const profile = await profileLaden([...gegenueber.values()]);
  const daten = leer();

  for (const eintrag of eintraege) {
    const profil = profile.get(gegenueber.get(eintrag.id)!);
    // Profil nicht auffindbar (z. B. gerade gelöscht) — Eintrag überspringen.
    if (!profil) continue;

    const partnerschaft: Partnerschaft = { id: eintrag.id, partner: profil };

    if (eintrag.status === "accepted") {
      daten.partner.push(partnerschaft);
    } else if (eintrag.requester_id === userId) {
      daten.ausgehend.push(partnerschaft);
    } else {
      daten.eingehend.push(partnerschaft);
    }
  }

  daten.partner.sort(nachNamen);
  daten.eingehend.sort(nachNamen);
  daten.ausgehend.sort(nachNamen);

  return daten;
}

/** Die bestätigten Partner — Auswahl für „Kunde eines Vertriebspartners". */
export async function bestaetigtePartner(userId: string): Promise<PartnerProfil[]> {
  const { partner } = await partnerDatenLaden(userId);
  return partner.map((eintrag) => eintrag.partner);
}

/**
 * Prüft, ob zwischen beiden eine bestätigte Partnerschaft besteht. Wird
 * gebraucht, bevor ein Kunde einem Vertriebspartner zugeordnet wird.
 */
export async function istBestaetigterPartner(
  userId: string,
  partnerId: string,
): Promise<boolean> {
  if (!istUuid(partnerId) || partnerId === userId) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("partnerships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${partnerId}),` +
        `and(requester_id.eq.${partnerId},addressee_id.eq.${userId})`,
    )
    .maybeSingle();

  return data !== null;
}
