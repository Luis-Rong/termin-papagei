-- Phase 6: E-Mail-Signatur je Vermittler.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

alter table public.profiles
  add column if not exists signature text;

comment on column public.profiles.signature is
  'Freitext, hängt automatisch unter jede Mail, die dieser Vermittler verschickt. '
  'Leer ist erlaubt — dann bleibt die Mail ohne Signaturblock.';
