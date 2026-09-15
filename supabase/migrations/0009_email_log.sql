-- Phase 6: Protokoll verschickter Mails (Duplikatschutz) und der gespeicherte
-- Mail-Entwurf zur Terminbestätigung.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,

  recipient text not null,
  -- Deckt sich mit templates.purpose (0008_vorlagen.sql). Phase 7 (Erinnerungs-
  -- Job) schreibt hierher dieselben Werte, um Doppelversand zu verhindern.
  purpose text not null
    check (purpose in ('bestaetigung', 'erinnerung_1tag', 'erinnerung_2std')),

  sent_at timestamptz not null default now(),
  -- Nur bei einem fehlgeschlagenen Versuch gesetzt, damit die Terminseite den
  -- Fehler anzeigen kann. Ein fehlgeschlagener Versuch zählt nicht als
  -- "schon verschickt" für den Duplikatschutz (siehe Index unten).
  error text
);

comment on table public.email_log is
  'Protokoll verschickter Mails je Termin und Zweck — verhindert Doppelversand '
  'zwischen Sofort-Bestätigung und dem künftigen Erinnerungs-Job (Phase 7).';

-- Genau die Abfrage für den Duplikatschutz: "wurde diese Mail für diesen
-- Termin schon erfolgreich verschickt?".
create index if not exists email_log_zuordnung_idx
  on public.email_log (appointment_id, purpose)
  where error is null;

alter table public.email_log enable row level security;

-- Sichtbar und anlegbar nur für den Besitzer des zugehörigen Termins.
drop policy if exists "email_log_select_eigener_termin" on public.email_log;
create policy "email_log_select_eigener_termin"
  on public.email_log for select
  to authenticated
  using (
    exists (
      select 1 from public.appointments a
      where a.id = email_log.appointment_id
        and a.owner_id = (select auth.uid())
    )
  );

drop policy if exists "email_log_insert_eigener_termin" on public.email_log;
create policy "email_log_insert_eigener_termin"
  on public.email_log for insert
  to authenticated
  with check (
    exists (
      select 1 from public.appointments a
      where a.id = email_log.appointment_id
        and a.owner_id = (select auth.uid())
    )
  );

-- Der personalisierte (oder bei LLM-Fehlschlag: nur Platzhalter-ersetzte)
-- Mailtext zur Terminbestätigung — sichtbar und bearbeitbar auf der
-- Terminseite, bevor er verschickt wird ("Vorschau vor Versand").
alter table public.appointments
  add column if not exists bestaetigung_entwurf_html text;

comment on column public.appointments.bestaetigung_entwurf_html is
  'HTML-Entwurf der Bestätigungsmail, direkt nach Terminanlage erzeugt. '
  'Bleibt unverschickt, bis auf der Terminseite aktiv "Senden" geklickt wird.';
