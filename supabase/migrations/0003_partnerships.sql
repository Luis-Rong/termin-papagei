-- Phase 3: Partner-Netzwerk zwischen den Vermittlern ("Freundesliste").
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  -- Wer die Anfrage gestellt hat …
  requester_id uuid not null references public.profiles (id) on delete cascade,
  -- … und wer sie annehmen oder ablehnen darf.
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  -- Eine abgelehnte Anfrage wird gelöscht, nicht gespeichert: So kann man es
  -- später erneut versuchen, ohne dass Altlasten im Weg stehen.
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Niemand ist sein eigener Partner.
  constraint partnerships_nicht_selbst check (requester_id <> addressee_id)
);

comment on table public.partnerships is
  'Partnerschaft zwischen zwei Vermittlern. Ein Eintrag pro Paar — die Richtung '
  'sagt nur, wer angefragt hat. status = accepted bedeutet: beide sind Partner.';

-- Ein Eintrag pro Paar, egal wer zuerst angefragt hat: least/greatest sortieren
-- die beiden Ids, dadurch kollidiert A→B mit B→A.
create unique index if not exists partnerships_paar_uniq
  on public.partnerships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

-- Für "meine offenen Anfragen" und "meine Freundesliste".
create index if not exists partnerships_requester_idx
  on public.partnerships (requester_id, status);
create index if not exists partnerships_addressee_idx
  on public.partnerships (addressee_id, status);

alter table public.partnerships enable row level security;

-- Sichtbar nur für die beiden Beteiligten.
drop policy if exists "partnerships_select_beteiligt" on public.partnerships;
create policy "partnerships_select_beteiligt"
  on public.partnerships for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Anfragen stellt man immer im eigenen Namen und immer als "pending".
drop policy if exists "partnerships_insert_eigene_anfrage" on public.partnerships;
create policy "partnerships_insert_eigene_anfrage"
  on public.partnerships for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_id
    and status = 'pending'
  );

-- Annehmen darf ausschließlich der Angefragte, und nur eine offene Anfrage.
-- Damit kann sich niemand selbst zum Partner eines anderen erklären.
drop policy if exists "partnerships_update_annehmen" on public.partnerships;
create policy "partnerships_update_annehmen"
  on public.partnerships for update
  to authenticated
  using ((select auth.uid()) = addressee_id and status = 'pending')
  with check ((select auth.uid()) = addressee_id and status = 'accepted');

-- Löschen darf jeder der beiden: Das deckt Anfrage zurücknehmen, Anfrage
-- ablehnen und eine bestehende Partnerschaft beenden gleichzeitig ab.
drop policy if exists "partnerships_delete_beteiligt" on public.partnerships;
create policy "partnerships_delete_beteiligt"
  on public.partnerships for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Die Update-Policy prüft nur den Zustand nach der Änderung. Ohne diesen
-- Trigger könnte der Angefragte beim Annehmen requester_id auf eine dritte
-- Person umbiegen und sich so eine nie gestellte Anfrage "annehmen".
create or replace function public.partnerschaft_beteiligte_unveraenderlich()
returns trigger
language plpgsql
as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'Die Beteiligten einer Partnerschaft lassen sich nicht ändern.';
  end if;
  return new;
end;
$$;

drop trigger if exists partnerships_beteiligte_unveraenderlich on public.partnerships;
create trigger partnerships_beteiligte_unveraenderlich
  before update on public.partnerships
  for each row execute function public.partnerschaft_beteiligte_unveraenderlich();

-- updated_at automatisch mitführen (Funktion stammt aus 0001_profiles.sql).
drop trigger if exists partnerships_set_updated_at on public.partnerships;
create trigger partnerships_set_updated_at
  before update on public.partnerships
  for each row execute function public.set_updated_at();
