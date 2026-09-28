-- Phase 6: Wann der Mail-Entwurf zur Terminbestätigung zuletzt geändert wurde.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".
--
-- Verglichen mit dem letzten Versand in `email_log` zeigt das, ob der Kunde
-- die aktuelle Fassung schon hat. Typischer Fall: Der Termin wird nach dem
-- Versand verschoben, der Entwurf entsteht mit dem neuen Datum neu — dann
-- muss die Bestätigung erneut raus, und Terminseite wie Terminliste sagen das.

alter table public.appointments
  add column if not exists bestaetigung_entwurf_am timestamptz;

comment on column public.appointments.bestaetigung_entwurf_am is
  'Letzte Änderung an bestaetigung_entwurf_html (neu erzeugt, von Hand oder per KI). '
  'Später als der letzte Versand in email_log = Kunde kennt diese Fassung noch nicht.';
