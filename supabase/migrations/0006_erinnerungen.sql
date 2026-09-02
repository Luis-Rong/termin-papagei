-- Phase 6: Zwei unabhängig konfigurierbare Kunden-Erinnerungen je Termin.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

alter table public.appointments
  add column if not exists erinnerung_1tag_aktiv boolean not null default true,
  add column if not exists erinnerung_1tag_stunden_vorher smallint not null default 24,
  add column if not exists erinnerung_2std_aktiv boolean not null default true,
  add column if not exists erinnerung_2std_stunden_vorher smallint not null default 2;

comment on column public.appointments.erinnerung_1tag_aktiv is
  'Kunden-Erinnerung mit ca. einem Tag Vorlauf. Standard an, im Termin-Wizard abschaltbar.';
comment on column public.appointments.erinnerung_1tag_stunden_vorher is
  'Vorlauf der ersten Erinnerung in Stunden vor Terminbeginn. Default 24, im Termin-Wizard änderbar.';
comment on column public.appointments.erinnerung_2std_aktiv is
  'Kunden-Erinnerung mit ca. zwei Stunden Vorlauf. Standard an, im Termin-Wizard abschaltbar.';
comment on column public.appointments.erinnerung_2std_stunden_vorher is
  'Vorlauf der zweiten Erinnerung in Stunden vor Terminbeginn. Default 2, im Termin-Wizard änderbar.';

alter table public.appointments
  add constraint appointments_erinnerung_1tag_stunden_positiv
    check (erinnerung_1tag_stunden_vorher > 0 and erinnerung_1tag_stunden_vorher <= 168),
  add constraint appointments_erinnerung_2std_stunden_positiv
    check (erinnerung_2std_stunden_vorher > 0 and erinnerung_2std_stunden_vorher <= 168);
