-- Front-End-Runde 3 (Mart, 28.10.2026): bis zu fünf Kunden-Erinnerungen je Termin,
-- Vorlauf bis zwei Wochen, Kunde mit nur Vor- oder nur Nachname.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

-- 1) Erinnerung 3–5 als Liste; Erinnerung 1 und 2 bleiben in ihren Spalten.
--    Ein Eintrag: {"aktiv":true,"modus":"vorlauf","stunden":48,"tage":0,"uhrzeit":"09:00"}
alter table public.appointments
  add column if not exists erinnerungen_weitere jsonb not null default '[]'::jsonb;

alter table public.appointments drop constraint if exists appointments_erinnerungen_weitere_max;
alter table public.appointments
  add constraint appointments_erinnerungen_weitere_max
  check (jsonb_typeof(erinnerungen_weitere) = 'array' and jsonb_array_length(erinnerungen_weitere) <= 3);

comment on column public.appointments.erinnerungen_weitere is
  'Erinnerungen 3 bis 5 an den Kunden (Liste, gleiche Felder wie erinnerung_1tag_*). Erinnerung 1 und 2 stehen in den eigenen Spalten.';

-- 2) Vorlauf bis 2 Wochen (336 Stunden), Tage bis 14.
alter table public.appointments drop constraint if exists appointments_erinnerung_1tag_stunden_positiv;
alter table public.appointments drop constraint if exists appointments_erinnerung_2std_stunden_positiv;
alter table public.appointments
  add constraint appointments_erinnerung_1tag_stunden_positiv
    check (erinnerung_1tag_stunden_vorher > 0 and erinnerung_1tag_stunden_vorher <= 336),
  add constraint appointments_erinnerung_2std_stunden_positiv
    check (erinnerung_2std_stunden_vorher > 0 and erinnerung_2std_stunden_vorher <= 336);

alter table public.appointments drop constraint if exists appointments_erinnerung_tage;
alter table public.appointments
  add constraint appointments_erinnerung_tage
  check (erinnerung_1tag_tage_vorher between 0 and 14
     and erinnerung_2std_tage_vorher between 0 and 14);

-- 3) Das Mail-Protokoll kennt die weiteren Erinnerungen.
alter table public.email_log drop constraint if exists email_log_purpose_check;
alter table public.email_log
  add constraint email_log_purpose_check
  check (purpose in ('bestaetigung', 'erinnerung_1tag', 'erinnerung_2std',
                     'erinnerung_3', 'erinnerung_4', 'erinnerung_5', 'anruf_erinnerung'));

-- 4) Kunde: Vor- ODER Nachname reicht. Mit nur Vornamen geht nur Du, mit nur
--    Nachnamen nur Sie — das prüft die App.
alter table public.customers alter column first_name drop not null;
alter table public.customers alter column last_name drop not null;
alter table public.customers drop constraint if exists customers_name_vorhanden;
alter table public.customers
  add constraint customers_name_vorhanden
  check (coalesce(nullif(trim(first_name), ''), nullif(trim(last_name), '')) is not null);
