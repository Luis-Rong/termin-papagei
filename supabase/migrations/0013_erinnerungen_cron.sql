-- Phase 7: Der Zeitplan für den Erinnerungs-Job.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".
--
-- Alle 15 Minuten ruft die Datenbank die Adresse /api/erinnerungen der
-- Anwendung auf. Dort steckt die ganze Logik — mit denselben Regeln,
-- Vorlagen und demselben Mailversand wie die Terminbestätigung (siehe
-- src/lib/erinnerungen/). Eine Supabase Edge Function müsste das alles in
-- Deno nachbauen; genau das verbietet CLAUDE.md ("nie in Jobs nachbauen").
--
-- Adresse und Geheimnis stehen NICHT hier, sondern im Supabase Vault —
-- sonst lägen sie im Repo. Einmalig im SQL Editor ausführen, sobald die
-- Anwendung öffentlich erreichbar ist (localhost erreicht Supabase nicht):
--
--   select vault.create_secret('https://DEINE-DOMAIN/api/erinnerungen', 'erinnerung_url');
--   select vault.create_secret('WERT-VON-ERINNERUNG_GEHEIMNIS', 'erinnerung_geheimnis');
--
-- Solange die beiden Einträge fehlen, läuft der Zeitplan zwar, tut aber nichts.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.erinnerungen_anstossen()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ziel text;
  geheimnis text;
begin
  select decrypted_secret into ziel
    from vault.decrypted_secrets where name = 'erinnerung_url';
  select decrypted_secret into geheimnis
    from vault.decrypted_secrets where name = 'erinnerung_geheimnis';

  if ziel is null or geheimnis is null then
    return;
  end if;

  perform net.http_post(
    url := ziel,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || geheimnis
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

comment on function public.erinnerungen_anstossen() is
  'Stößt den Erinnerungs-Job der Anwendung an (POST /api/erinnerungen). Läuft per pg_cron alle 15 Minuten.';

-- Nur der Zeitplan selbst darf die Funktion aufrufen, nicht angemeldete Nutzer.
revoke all on function public.erinnerungen_anstossen() from public, anon, authenticated;

-- Zeitplan (neu) anlegen — ein erneutes Ausführen der Migration ersetzt ihn.
select cron.unschedule(jobid) from cron.job where jobname = 'erinnerungen';
select cron.schedule('erinnerungen', '*/15 * * * *', 'select public.erinnerungen_anstossen()');
