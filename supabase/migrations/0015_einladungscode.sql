-- Der Einladungscode für die Registrierung liegt in der Datenbank statt in .env.local.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".
--
-- Bisher stand der Code als SIGNUP_INVITE_CODE in der .env.local — und damit nur
-- bei dem, der die Datei hatte. Wer sich registrieren wollte, ohne den Wert bei
-- sich eingetragen zu haben, bekam einen Fehler. Jetzt prüft die Datenbank den
-- Code, egal von wo aus die Anwendung läuft.
--
-- Die Tabelle ist für alle Nutzer unsichtbar (RLS an, keine Policy): Den Code
-- kann niemand auslesen. Die Anwendung darf nur fragen "Ist dieser Code gültig?",
-- und zwar über die Funktion unten — sie antwortet mit ja oder nein.

create table if not exists public.einladungscodes (
  code text primary key check (code <> '' and code = btrim(code)),
  aktiv boolean not null default true,
  notiz text,
  created_at timestamptz not null default now()
);

comment on table public.einladungscodes is
  'Gültige Einladungscodes für die Registrierung. Nur im Dashboard (SQL Editor / Table Editor) pflegen; für die App nicht lesbar.';
comment on column public.einladungscodes.aktiv is
  'Auf false setzen, um einen Code zu sperren, ohne ihn zu löschen.';
comment on column public.einladungscodes.notiz is
  'Freitext für Menschen, z. B. wofür oder für wen der Code gedacht ist.';

alter table public.einladungscodes enable row level security;
revoke all on table public.einladungscodes from anon, authenticated;

-- Die einzige Frage, die die Anwendung stellen darf. Groß-/Kleinschreibung
-- zählt (wie bisher); Leerzeichen am Rand werden ignoriert.
create or replace function public.einladungscode_gueltig(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.einladungscodes
    where code = btrim(coalesce(p_code, ''))
      and aktiv
  );
$$;

revoke all on function public.einladungscode_gueltig(text) from public;
grant execute on function public.einladungscode_gueltig(text) to anon, authenticated;

-- Danach EINMAL den Code eintragen (Wort frei wählbar), sonst kann sich niemand
-- registrieren:
--
--   insert into public.einladungscodes (code, notiz)
--   values ('HIER-DEIN-WORT', 'Team-Code');
--
-- Code wechseln: neuen Code eintragen, den alten mit
--   update public.einladungscodes set aktiv = false where code = 'ALTES-WORT';
-- sperren.
