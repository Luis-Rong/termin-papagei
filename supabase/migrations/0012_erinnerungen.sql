-- Phase 7: email_log wird zum Gedächtnis des Erinnerungs-Jobs.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

-- 1) Neuer Zweck: die Anruf-Erinnerung an den Vermittler (Umsetzung, 1 Tag vorher).
alter table public.email_log drop constraint if exists email_log_purpose_check;
alter table public.email_log
  add constraint email_log_purpose_check
  check (purpose in ('bestaetigung', 'erinnerung_1tag', 'erinnerung_2std', 'anruf_erinnerung'));

-- 2) Für welchen Terminbeginn die Mail galt. Wird ein Termin verschoben,
--    zählt eine alte Erinnerung nicht mehr als "schon verschickt" — der
--    Kunde bekommt eine neue mit dem richtigen Datum.
alter table public.email_log
  add column if not exists termin_beginn timestamptz;

comment on column public.email_log.termin_beginn is
  'Terminbeginn, auf den sich die Erinnerung bezog. Nach einer Verschiebung gilt '
  'die Erinnerung für den neuen Beginn als noch nicht verschickt.';

-- 3) Doppelversand technisch ausschließen: Der Job trägt die Zeile VOR dem
--    Versand ein. Laufen zwei Durchgänge gleichzeitig, scheitert der zweite
--    an diesem Index und verschickt nichts. Die Bestätigung ist ausgenommen —
--    sie darf auf Wunsch erneut verschickt werden.
create unique index if not exists email_log_erinnerung_einmalig_idx
  on public.email_log (appointment_id, purpose, termin_beginn)
  where error is null and purpose <> 'bestaetigung';
