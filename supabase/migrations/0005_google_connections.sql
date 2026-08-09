-- Phase 5: Verbindung zum Google-Kalender, ein Eintrag je Vermittler.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

create table if not exists public.google_connections (
  -- Ein Vermittler verbindet genau ein Google-Konto, deshalb ist user_id der
  -- Primärschlüssel: Ein zweites Verbinden überschreibt das erste.
  user_id uuid primary key references public.profiles (id) on delete cascade,

  -- Die Google-Adresse, mit der verbunden wurde. Muss keine @gmail.com sein —
  -- ein Google-Konto lässt sich mit jeder E-Mail-Adresse anlegen.
  google_email text not null,

  -- Verschlüsselt (AES-256-GCM) mit dem Schlüssel aus KALENDER_TOKEN_SCHLUESSEL,
  -- siehe src/lib/kalender/verschluesselung.ts. Im Klartext stünde hier ein
  -- Dauerzugang zum Kalender des Vermittlers — auch für jeden, der später
  -- einmal einen Datenbank-Export in die Hand bekommt.
  refresh_token text not null,

  -- In welchen Kalender geschrieben wird. 'primary' ist der Hauptkalender des
  -- Kontos; die Spalte hält die Tür für eine spätere Kalenderauswahl offen.
  calendar_id text not null default 'primary',

  -- Womit der Nutzer zugestimmt hat. Nur zur Diagnose: Fehlt später ein Recht,
  -- sieht man hier, ob die Zustimmung von vor einer Änderung stammt.
  scopes text,

  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.google_connections is
  'Google-Kalender-Verbindung je Vermittler. Optional: Ohne Eintrag funktioniert '
  'die Anwendung vollständig, nur ohne Kalender-Synchronisation.';

alter table public.google_connections enable row level security;

-- Der Refresh-Token gehört ausschließlich seinem Besitzer. Es gibt bewusst
-- keine Policy, die einem Partner das Lesen erlaubt (siehe Funktion unten).
drop policy if exists "google_connections_select_own" on public.google_connections;
create policy "google_connections_select_own"
  on public.google_connections for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "google_connections_insert_own" on public.google_connections;
create policy "google_connections_insert_own"
  on public.google_connections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "google_connections_update_own" on public.google_connections;
create policy "google_connections_update_own"
  on public.google_connections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "google_connections_delete_own" on public.google_connections;
create policy "google_connections_delete_own"
  on public.google_connections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Bei einem gemeinsamen Termin wird der Partner als Teilnehmer eingetragen —
-- dafür wird seine Google-Adresse gebraucht, und nur die. Die Funktion gibt
-- ausschließlich die Adresse heraus, niemals den Token, und nur an einen
-- bestätigten Partner. Ohne Partnerschaft kommt null zurück.
create or replace function public.partner_google_adresse(partner uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select g.google_email
  from public.google_connections g
  where g.user_id = partner
    and exists (
      select 1
      from public.partnerships p
      where p.status = 'accepted'
        and (
          (p.requester_id = auth.uid() and p.addressee_id = partner)
          or (p.addressee_id = auth.uid() and p.requester_id = partner)
        )
    );
$$;

comment on function public.partner_google_adresse(uuid) is
  'Google-Adresse eines bestätigten Partners, für die Teilnehmerliste eines '
  'gemeinsamen Termins. Bewusst security definer: Die Tabelle selbst bleibt '
  'für alle außer dem Besitzer gesperrt.';

revoke all on function public.partner_google_adresse(uuid) from public;
grant execute on function public.partner_google_adresse(uuid) to authenticated;

-- Der Termin des Partners entsteht nicht als eigener Kalendereintrag, sondern
-- dadurch, dass der Partner Teilnehmer am Termin des Besitzers ist: Google legt
-- ihn dann in seinen Kalender, Verschieben und Absagen wandern automatisch mit,
-- und beide sehen denselben Meet-Link. Die Spalte bleibt deshalb leer.
comment on column public.appointments.partner_google_event_id is
  'Unbenutzt: Der Partner wird als Teilnehmer am Termin des Besitzers geführt, '
  'nicht über einen zweiten Kalendereintrag.';

-- updated_at automatisch mitführen (Funktion stammt aus 0001_profiles.sql).
drop trigger if exists google_connections_set_updated_at on public.google_connections;
create trigger google_connections_set_updated_at
  before update on public.google_connections
  for each row execute function public.set_updated_at();
