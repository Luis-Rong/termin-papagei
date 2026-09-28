/**
 * Der Erinnerungs-Job (Phase 7): Findet alle Erinnerungen, die gerade fällig
 * sind, und verschickt sie — an Kunden mit ihrer Vorlage und der Signatur des
 * Vermittlers, an den Vermittler die Anruf-Erinnerung bei Umsetzung-Terminen.
 *
 * Angestoßen alle 15 Minuten von pg_cron über POST /api/erinnerungen (siehe
 * 0013_erinnerungen_cron.sql). Ob etwas fällig ist, entscheidet allein
 * `erinnerungsPlan` — dieselbe Funktion, die auch die Terminseite anzeigt.
 *
 * Läuft ohne angemeldeten Nutzer über alle Vermittler, deshalb mit dem
 * Admin-Client. Wirft nie wegen eines einzelnen Termins: Jeder Fehler landet
 * im Bericht und in `email_log`, der nächste Durchgang versucht es erneut.
 */

import { mailVersenden } from "@/lib/email";
import {
  ERINNERUNGS_ARTEN,
  erinnerungsPlan,
  laengsterVorlaufStunden,
  type ErinnerungsArt,
} from "@/lib/erinnerungen/plan";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  absenderName,
  erinnerungBetreff,
  mailMitSignatur,
  mitMeetLink,
  platzhalterWerte,
} from "@/lib/termine/mail";
import {
  ERINNERUNG_STUNDEN_MAX,
  istTerminart,
  type Ort,
  type Terminart,
} from "@/lib/termine/terminarten";
import { htmlEscapen, platzhalterErsetzen, vorlageLaden } from "@/lib/vorlagen/abfragen";
import { formatiereDatum, formatiereUhrzeit } from "@/lib/zeit";

type Admin = ReturnType<typeof createAdminClient>;

type TerminZeile = {
  id: string;
  owner_id: string;
  customer_id: string;
  appointment_type: string;
  location: Ort;
  starts_at: string;
  created_at: string;
  status: string;
  meet_link: string | null;
  erinnerung_1tag_aktiv: boolean;
  erinnerung_1tag_stunden_vorher: number;
  erinnerung_2std_aktiv: boolean;
  erinnerung_2std_stunden_vorher: number;
};

type Kunde = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

type Profil = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string;
  signature: string | null;
};

export type JobBericht = {
  geprueft: number;
  verschickt: number;
  fehler: string[];
};

type Mail = { an: string; betreff: string; html: string; absender: string; antwortAn: string };

/** Mail an den Kunden aus seiner Vorlage (Zweck = Erinnerungsart). */
async function kundenMail(
  admin: Admin,
  termin: TerminZeile,
  terminart: Terminart,
  zweck: "erinnerung_1tag" | "erinnerung_2std",
  kunde: Kunde,
  profil: Profil,
): Promise<Mail | { fehler: string }> {
  if (!kunde.email) return { fehler: "Kunde ohne E-Mail-Adresse" };

  const vorlage = await vorlageLaden(admin, termin.owner_id, terminart, zweck);
  if (!vorlage) return { fehler: `Keine Vorlage für ${zweck}` };

  const werte = platzhalterWerte(termin, { vorname: kunde.first_name });
  return {
    an: kunde.email,
    betreff: erinnerungBetreff(vorlage, terminart, werte),
    html: mailMitSignatur(
      mitMeetLink(platzhalterErsetzen(vorlage.html, werte), termin),
      profil.signature,
    ),
    absender: absenderName(profil),
    antwortAn: profil.email,
  };
}

/** Interne Mail an den Vermittler: morgen Umsetzung, bitte vorher anrufen. */
function anrufMail(termin: TerminZeile, kunde: Kunde, profil: Profil, basisUrl: string): Mail {
  const name = htmlEscapen(`${kunde.first_name} ${kunde.last_name}`.trim());
  const datum = formatiereDatum(termin.starts_at);
  const uhrzeit = formatiereUhrzeit(termin.starts_at);
  const telefon = kunde.phone?.trim();
  const link = new URL(`/termine/${termin.id}`, basisUrl).toString();

  return {
    an: profil.email,
    betreff: `Bitte anrufen: ${kunde.first_name} ${kunde.last_name} — Umsetzung am ${datum}`,
    html: [
      `<p>Hallo ${htmlEscapen(profil.first_name ?? "")},</p>`,
      `<p>am ${htmlEscapen(datum)} um ${htmlEscapen(uhrzeit)} Uhr steht die Umsetzung mit <strong>${name}</strong> an. Bitte ruf vorher kurz an.</p>`,
      telefon
        ? `<p>Telefon: <a href="tel:${htmlEscapen(telefon.replace(/[^\d+]/g, ""))}">${htmlEscapen(telefon)}</a></p>`
        : `<p>Für diesen Kunden ist keine Telefonnummer hinterlegt.</p>`,
      `<p><a href="${htmlEscapen(link)}">Termin öffnen</a></p>`,
    ].join(""),
    absender: "Termin Papagei",
    antwortAn: profil.email,
  };
}

/**
 * Trägt die Erinnerung vor dem Versand in `email_log` ein. Scheitert das am
 * eindeutigen Index, hat ein paralleler Durchgang sie schon — dann nichts tun.
 */
async function reservieren(
  admin: Admin,
  termin: TerminZeile,
  art: ErinnerungsArt,
  empfaenger: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("email_log")
    .insert({
      appointment_id: termin.id,
      recipient: empfaenger,
      purpose: art,
      termin_beginn: termin.starts_at,
    })
    .select("id")
    .single();

  return error ? null : data.id;
}

export async function erinnerungenVerschicken(
  basisUrl: string,
  jetzt = new Date(),
): Promise<JobBericht> {
  const admin = createAdminClient();
  const bericht: JobBericht = { geprueft: 0, verschickt: 0, fehler: [] };

  // Nur Termine, für die überhaupt eine Erinnerung anstehen kann.
  const bis = new Date(
    jetzt.getTime() + laengsterVorlaufStunden(ERINNERUNG_STUNDEN_MAX) * 60 * 60 * 1000,
  );
  const { data: zeilen, error } = await admin
    .from("appointments")
    .select(
      "id, owner_id, customer_id, appointment_type, location, starts_at, created_at, status, meet_link, erinnerung_1tag_aktiv, erinnerung_1tag_stunden_vorher, erinnerung_2std_aktiv, erinnerung_2std_stunden_vorher",
    )
    .eq("kind", "kundentermin")
    .eq("status", "geplant")
    .not("customer_id", "is", null)
    .gt("starts_at", jetzt.toISOString())
    .lte("starts_at", bis.toISOString());

  if (error) {
    bericht.fehler.push(`Termine laden: ${error.message}`);
    return bericht;
  }

  const termine = (zeilen ?? []) as TerminZeile[];
  bericht.geprueft = termine.length;
  if (termine.length === 0) return bericht;

  const [{ data: kunden }, { data: profile }, { data: log }] = await Promise.all([
    admin
      .from("customers")
      .select("id, first_name, last_name, email, phone")
      .in("id", [...new Set(termine.map((t) => t.customer_id))]),
    admin
      .from("profiles")
      .select("id, first_name, last_name, company, email, signature")
      .in("id", [...new Set(termine.map((t) => t.owner_id))]),
    admin
      .from("email_log")
      .select("appointment_id, purpose, sent_at, termin_beginn")
      .in("appointment_id", termine.map((t) => t.id))
      .in("purpose", ERINNERUNGS_ARTEN)
      .is("error", null),
  ]);

  const kundeNachId = new Map((kunden as Kunde[] | null ?? []).map((k) => [k.id, k]));
  const profilNachId = new Map((profile as Profil[] | null ?? []).map((p) => [p.id, p]));

  for (const termin of termine) {
    const terminart = termin.appointment_type;
    if (!istTerminart(terminart)) continue;
    const kunde = kundeNachId.get(termin.customer_id);
    const profil = profilNachId.get(termin.owner_id);
    if (!kunde || !profil) continue;

    // Nur was für genau diesen Beginn rausging, zählt als verschickt.
    const beginn = new Date(termin.starts_at).getTime();
    const verschickt: Partial<Record<ErinnerungsArt, string>> = {};
    for (const eintrag of log ?? []) {
      if (
        eintrag.appointment_id === termin.id &&
        eintrag.termin_beginn &&
        new Date(eintrag.termin_beginn).getTime() === beginn
      ) {
        verschickt[eintrag.purpose as ErinnerungsArt] = eintrag.sent_at;
      }
    }

    const plan = erinnerungsPlan(
      {
        terminart,
        status: termin.status,
        beginn: termin.starts_at,
        angelegtAm: termin.created_at,
        kundeHatEmail: Boolean(kunde.email?.trim()),
        erinnerung1TagAktiv: termin.erinnerung_1tag_aktiv,
        erinnerung1TagStunden: termin.erinnerung_1tag_stunden_vorher,
        erinnerung2StdAktiv: termin.erinnerung_2std_aktiv,
        erinnerung2StdStunden: termin.erinnerung_2std_stunden_vorher,
      },
      verschickt,
      jetzt,
    );

    for (const art of ERINNERUNGS_ARTEN) {
      if (plan[art]?.zustand !== "faellig") continue;

      const mail =
        art === "anruf_erinnerung"
          ? anrufMail(termin, kunde, profil, basisUrl)
          : await kundenMail(admin, termin, terminart, art, kunde, profil);

      if ("fehler" in mail) {
        bericht.fehler.push(`${termin.id} ${art}: ${mail.fehler}`);
        continue;
      }

      const logId = await reservieren(admin, termin, art, mail.an);
      if (!logId) continue;

      const ergebnis = await mailVersenden({
        an: mail.an,
        betreff: mail.betreff,
        html: mail.html,
        absenderName: mail.absender,
        replyTo: mail.antwortAn,
      });

      if (ergebnis.status === "ok") {
        bericht.verschickt += 1;
        continue;
      }

      // Fehlgeschlagen: Zeile als Fehler markieren — zählt dann nicht als
      // verschickt, der nächste Durchgang versucht es erneut.
      const meldung =
        ergebnis.status === "fehler" ? ergebnis.meldung : "RESEND_API_KEY fehlt";
      await admin.from("email_log").update({ error: meldung }).eq("id", logId);
      bericht.fehler.push(`${termin.id} ${art}: ${meldung}`);
    }
  }

  return bericht;
}
