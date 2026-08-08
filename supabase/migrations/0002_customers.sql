-- Phase 2: Kunden der Vermittler.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  -- Gefüllt, wenn der Kunde über einen Vertriebspartner kommt (Auswahl aus der
  -- Freundesliste, Phase 3). Bleibt der Partner-Account gelöscht, wird der Kunde
  -- nicht mitgelöscht — er gehört weiterhin dem Vermittler.
  source_partner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Ein Kunde ohne jede Kontaktmöglichkeit ergibt keinen Sinn: Für die
  -- Terminbestätigung brauchen wir mindestens eine E-Mail-Adresse oder Telefon.
  constraint customers_kontakt_vorhanden check (
    coalesce(nullif(trim(email), ''), nullif(trim(phone), '')) is not null
  ),
  -- Niemand ist sein eigener Vertriebspartner.
  constraint customers_partner_nicht_selbst check (source_partner_id <> owner_id)
);

comment on table public.customers is
  'Kunden eines Vermittlers. source_partner_id verweist auf den Vertriebspartner, '
  'über den der Kunde kam (null = eigener Kunde).';

-- Die Übersicht sortiert nach Nachname und filtert immer nach owner_id.
create index if not exists customers_owner_id_idx
  on public.customers (owner_id, last_name, first_name);

alter table public.customers enable row level security;

-- Kundendaten sind der sensibelste Teil der Anwendung (DSGVO): Sie sind
-- ausschließlich für den Vermittler sichtbar, dem sie gehören. Auch der
-- Vertriebspartner aus source_partner_id bekommt sie bewusst NICHT zu sehen.
drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own"
  on public.customers for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "customers_insert_own" on public.customers;
create policy "customers_insert_own"
  on public.customers for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own"
  on public.customers for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "customers_delete_own" on public.customers;
create policy "customers_delete_own"
  on public.customers for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- updated_at automatisch mitführen (Funktion stammt aus 0001_profiles.sql).
drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();
