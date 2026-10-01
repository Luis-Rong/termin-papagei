-- Der Kunde kann einen Termin über einen Link in der Bestätigungsmail zusagen.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".
--
-- Der Kunde hat keinen Account. Sein "Ausweis" ist ein langer, zufälliger
-- Schlüssel im Link (zusage_token). Wer ihn kennt, sieht genau diesen einen
-- Termin (Art, Zeit, Ort, Name des Vermittlers) und kann ihn zusagen — sonst
-- nichts. Deshalb laufen beide Zugriffe über eng begrenzte Funktionen statt
-- über eine RLS-Policy, die die Tabelle für Unangemeldete öffnen würde.

alter table public.appointments
  add column if not exists zusage_token text not null
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  add column if not exists kunde_zugesagt_am timestamptz;

create unique index if not exists appointments_zusage_token_idx
  on public.appointments (zusage_token);

comment on column public.appointments.zusage_token is
  'Zufälliger Schlüssel im Zusage-Link der Bestätigungsmail (64 Hex-Zeichen).';
comment on column public.appointments.kunde_zugesagt_am is
  'Wann der Kunde den Termin über den Link zugesagt hat. Wird zurückgesetzt, wenn der Termin verschoben wird.';

-- Was die öffentliche Seite /zusage/<token> anzeigen darf.
create or replace function public.termin_zusage_laden(p_token text)
returns table (
  terminart text,
  beginn timestamptz,
  ende timestamptz,
  ort text,
  meet_link text,
  status text,
  zugesagt_am timestamptz,
  vermittler text,
  firma text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.appointment_type,
    a.starts_at,
    a.ends_at,
    a.location,
    a.meet_link,
    a.status,
    a.kunde_zugesagt_am,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
    p.company
  from public.appointments a
  join public.profiles p on p.id = a.owner_id
  where a.zusage_token = p_token
    and a.kind = 'kundentermin'
    and length(p_token) >= 32;
$$;

-- Zusage eintragen. Nur für geplante Termine in der Zukunft; eine zweite
-- Zusage ändert nichts mehr. Liefert, ob der Termin jetzt zugesagt ist.
create or replace function public.termin_zusagen(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  zugesagt timestamptz;
begin
  if length(p_token) < 32 then
    return false;
  end if;

  update public.appointments
    set kunde_zugesagt_am = now()
    where zusage_token = p_token
      and kind = 'kundentermin'
      and status = 'geplant'
      and starts_at > now()
      and kunde_zugesagt_am is null;

  select kunde_zugesagt_am into zugesagt
    from public.appointments
    where zusage_token = p_token;

  return zugesagt is not null;
end;
$$;

revoke all on function public.termin_zusage_laden(text) from public;
revoke all on function public.termin_zusagen(text) from public;
grant execute on function public.termin_zusage_laden(text) to anon, authenticated;
grant execute on function public.termin_zusagen(text) to anon, authenticated;
