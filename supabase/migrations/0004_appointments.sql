-- Phase 4: Termine (Kundentermine und Vorbereitungstermine).
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,

  -- Kundentermin oder Vorbereitungstermin. Ein Vorbereitungstermin läuft nur im
  -- eigenen Kalender und geht den Kunden nichts an — deshalb ohne customer_id.
  kind text not null default 'kundentermin'
    check (kind in ('kundentermin', 'vorbereitung')),
  customer_id uuid references public.customers (id) on delete cascade,
  -- Die Beratung, zu der ein Vorbereitungstermin gehört.
  parent_appointment_id uuid references public.appointments (id) on delete cascade,

  -- Beteiligter Vertriebspartner. Wird der Partner-Account gelöscht, bleibt der
  -- Termin bestehen und gilt ab dann als eigener Termin.
  partner_id uuid references public.profiles (id) on delete set null,

  appointment_type text
    check (appointment_type in
      ('erstgespraech', 'beratung', 'umsetzung', 'after_sales', 'service')),
  location text not null check (location in ('buero', 'digital')),

  -- Immer als echter Zeitpunkt (UTC) gespeichert. Die Umrechnung aus der
  -- eingegebenen Berliner Uhrzeit passiert in src/lib/zeit.ts.
  starts_at timestamptz not null,
  ends_at timestamptz not null,

  notes text,
  status text not null default 'geplant'
    check (status in ('geplant', 'wahrgenommen', 'abgesagt')),

  -- Wird erst ab Phase 5 (Google Kalender/Meet) gefüllt.
  google_event_id text,
  partner_google_event_id text,
  meet_link text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointments_ende_nach_beginn check (ends_at > starts_at),
  constraint appointments_partner_nicht_selbst check (partner_id <> owner_id),

  -- Ein Kundentermin braucht Kunde und Terminart, ein Vorbereitungstermin
  -- hat beides nicht: Er ist ein reiner Eintrag im eigenen Kalender.
  constraint appointments_felder_je_art check (
    (kind = 'kundentermin'
      and customer_id is not null
      and appointment_type is not null)
    or
    (kind = 'vorbereitung'
      and customer_id is null
      and appointment_type is null)
  )
);

comment on table public.appointments is
  'Termine eines Vermittlers. kind = vorbereitung sind eigene Vorbereitungstermine '
  'ohne Kundenbezug, die über parent_appointment_id an einer Beratung hängen.';

-- Die Terminliste sortiert nach Beginn und filtert nach Besitzer bzw. Partner.
create index if not exists appointments_owner_idx
  on public.appointments (owner_id, starts_at);
create index if not exists appointments_partner_idx
  on public.appointments (partner_id, starts_at)
  where partner_id is not null;
create index if not exists appointments_customer_idx
  on public.appointments (customer_id);
create index if not exists appointments_parent_idx
  on public.appointments (parent_appointment_id)
  where parent_appointment_id is not null;

alter table public.appointments enable row level security;

-- Lesen darf der Besitzer und der beteiligte Vertriebspartner: Er sitzt beim
-- Termin mit am Tisch und bekommt ihn ab Phase 5 auch in seinen Kalender.
drop policy if exists "appointments_select_beteiligt" on public.appointments;
create policy "appointments_select_beteiligt"
  on public.appointments for select
  to authenticated
  using ((select auth.uid()) in (owner_id, partner_id));

-- Anlegen, Ändern und Löschen darf ausschließlich der Besitzer. Für den
-- Partner ist der Termin nur lesbar.
drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own"
  on public.appointments for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "appointments_update_own" on public.appointments;
create policy "appointments_update_own"
  on public.appointments for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "appointments_delete_own" on public.appointments;
create policy "appointments_delete_own"
  on public.appointments for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Damit der Partner beim gemeinsamen Termin weiß, um wen es geht, darf er
-- genau diesen einen Kunden lesen — nicht die Kundenkartei des anderen.
-- Die Freigabe endet automatisch, sobald der gemeinsame Termin weg ist.
--
-- Hinweis für den Datenschutzhinweis: Das ist eine Übermittlung an einen
-- eigenständig Verantwortlichen und muss dem Kunden gegenüber benannt sein.
drop policy if exists "customers_select_partner_termin" on public.customers;
create policy "customers_select_partner_termin"
  on public.customers for select
  to authenticated
  using (
    exists (
      select 1
      from public.appointments a
      where a.customer_id = customers.id
        and a.partner_id = (select auth.uid())
    )
  );

-- updated_at automatisch mitführen (Funktion stammt aus 0001_profiles.sql).
drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();
