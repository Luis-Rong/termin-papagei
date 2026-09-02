-- Phase 6: E-Mail-Vorlagen (Bestätigung + beide Erinnerungen) je Terminart.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),

  -- null = gemeinsame Systemvorlage (Startpunkt für alle), sonst eigene
  -- Vorlage eines Vermittlers. Eine eigene Kopie überschreibt die
  -- Systemvorlage nicht, sondern steht daneben — welche beim Versand
  -- vorausgewählt ist, entscheidet der Mailversand (kommt mit Phase 6).
  owner_id uuid references public.profiles (id) on delete cascade,

  appointment_type text not null
    check (appointment_type in
      ('erstgespraech', 'beratung', 'umsetzung', 'after_sales', 'service')),
  -- Deckt sich mit den beiden Erinnerungen aus 0006_erinnerungen.sql:
  -- erinnerung_1tag = ca. 1 Tag vorher, erinnerung_2std = ca. 2 Std vorher.
  purpose text not null
    check (purpose in ('bestaetigung', 'erinnerung_1tag', 'erinnerung_2std')),

  subject text not null,
  -- Platzhalter {{vorname}}, {{datum}}, {{uhrzeit}}, {{ort}} — werden beim
  -- Versand (Phase 6) durch die echten Termindaten ersetzt. Das LLM
  -- personalisiert danach nur noch die Formulierung, nie die Platzhalter-Werte
  -- selbst. Die Signatur (profiles.signature) hängt automatisch darunter,
  -- gehört also nicht in den Text.
  body text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.templates is
  'E-Mail-Vorlagen für Terminbestätigung und die beiden Erinnerungen. '
  'owner_id = null sind Systemvorlagen als gemeinsamer Startpunkt.';

create index if not exists templates_owner_idx
  on public.templates (owner_id)
  where owner_id is not null;
create index if not exists templates_zuordnung_idx
  on public.templates (appointment_type, purpose);

alter table public.templates enable row level security;

-- Lesen darf jeder Angemeldete die Systemvorlagen und seine eigenen —
-- fremde Vorlagen anderer Vermittler bleiben privat.
drop policy if exists "templates_select_eigene_oder_system" on public.templates;
create policy "templates_select_eigene_oder_system"
  on public.templates for select
  to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

-- Anlegen, ändern und löschen darf nur an den eigenen Vorlagen — die
-- Systemvorlagen (owner_id null) lassen sich über die App nicht anfassen,
-- nur über eine Migration oder das Dashboard.
drop policy if exists "templates_insert_own" on public.templates;
create policy "templates_insert_own"
  on public.templates for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "templates_update_own" on public.templates;
create policy "templates_update_own"
  on public.templates for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "templates_delete_own" on public.templates;
create policy "templates_delete_own"
  on public.templates for delete
  to authenticated
  using (owner_id = (select auth.uid()));

drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- Systemvorlagen: eine je Terminart und Zweck (5 × 3 = 15). Kurz und
-- vertrieblich verbindlich — passend zu einem Finanz-/Versicherungsmakler mit
-- Terminen zur ganzheitlichen Finanzplanung.
insert into public.templates (owner_id, appointment_type, purpose, subject, body) values

-- Erstgespräch
(null, 'erstgespraech', 'bestaetigung', 'Terminbestätigung: Erstgespräch am {{datum}}',
'Guten Tag {{vorname}},

hiermit bestätige ich unser Erstgespräch am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.

Wir verschaffen uns gemeinsam einen ersten Überblick über Ihre finanzielle Situation und Ihre Ziele. Sollte der Termin nicht passen, geben Sie mir bitte kurz Bescheid.

Ich freue mich auf unser Gespräch.'),

(null, 'erstgespraech', 'erinnerung_1tag', 'Erinnerung: Ihr Erstgespräch morgen',
'Guten Tag {{vorname}},

kurze Erinnerung an unser Erstgespräch morgen, {{datum}}, um {{uhrzeit}} Uhr, {{ort}}.

Ich freue mich auf Sie.'),

(null, 'erstgespraech', 'erinnerung_2std', 'In Kürze: Ihr Erstgespräch',
'Guten Tag {{vorname}},

Ihr Erstgespräch beginnt heute um {{uhrzeit}} Uhr, {{ort}}.

Bis gleich!'),

-- Beratung
(null, 'beratung', 'bestaetigung', 'Terminbestätigung: Beratungstermin am {{datum}}',
'Guten Tag {{vorname}},

Ihr Beratungstermin am {{datum}} um {{uhrzeit}} Uhr, {{ort}}, ist bestätigt.

Wir gehen die nächsten Schritte Ihrer Finanzplanung konkret durch. Bitte halten Sie sich die Zeit fest ein und melden sich bei Verhinderung kurzfristig.

Ich freue mich auf unser Gespräch.'),

(null, 'beratung', 'erinnerung_1tag', 'Erinnerung: Ihr Beratungstermin morgen',
'Guten Tag {{vorname}},

kurze Erinnerung an Ihren Beratungstermin morgen, {{datum}}, um {{uhrzeit}} Uhr, {{ort}}.

Bis morgen.'),

(null, 'beratung', 'erinnerung_2std', 'In Kürze: Ihr Beratungstermin',
'Guten Tag {{vorname}},

Ihr Beratungstermin beginnt heute um {{uhrzeit}} Uhr, {{ort}}.

Bis gleich!'),

-- Umsetzung
(null, 'umsetzung', 'bestaetigung', 'Terminbestätigung: Umsetzungstermin am {{datum}}',
'Guten Tag {{vorname}},

Ihr Umsetzungstermin am {{datum}} um {{uhrzeit}} Uhr, {{ort}}, ist bestätigt.

Wir setzen die vereinbarten Schritte gemeinsam um — bitte bringen Sie die besprochenen Unterlagen mit. Bei Verhinderung bitte ich um kurze Rückmeldung.

Ich freue mich auf unseren Termin.'),

(null, 'umsetzung', 'erinnerung_1tag', 'Erinnerung: Ihr Umsetzungstermin morgen',
'Guten Tag {{vorname}},

kurze Erinnerung an Ihren Umsetzungstermin morgen, {{datum}}, um {{uhrzeit}} Uhr, {{ort}}. Bitte denken Sie an die besprochenen Unterlagen.

Bis morgen.'),

(null, 'umsetzung', 'erinnerung_2std', 'In Kürze: Ihr Umsetzungstermin',
'Guten Tag {{vorname}},

Ihr Umsetzungstermin beginnt heute um {{uhrzeit}} Uhr, {{ort}}. Bitte halten Sie die besprochenen Unterlagen bereit.

Bis gleich!'),

-- After-Sales
(null, 'after_sales', 'bestaetigung', 'Terminbestätigung: Ihr Termin am {{datum}}',
'Guten Tag {{vorname}},

Ihr Termin am {{datum}} um {{uhrzeit}} Uhr, {{ort}}, ist bestätigt.

Wir schauen gemeinsam, wie Ihre bestehende Lösung zu Ihrer aktuellen Situation passt. Bei Verhinderung bitte ich um kurze Rückmeldung.

Ich freue mich auf unser Gespräch.'),

(null, 'after_sales', 'erinnerung_1tag', 'Erinnerung: Ihr Termin morgen',
'Guten Tag {{vorname}},

kurze Erinnerung an Ihren Termin morgen, {{datum}}, um {{uhrzeit}} Uhr, {{ort}}.

Bis morgen.'),

(null, 'after_sales', 'erinnerung_2std', 'In Kürze: Ihr Termin',
'Guten Tag {{vorname}},

Ihr Termin beginnt heute um {{uhrzeit}} Uhr, {{ort}}.

Bis gleich!'),

-- Service
(null, 'service', 'bestaetigung', 'Terminbestätigung: Ihr Termin am {{datum}}',
'Guten Tag {{vorname}},

Ihr Termin am {{datum}} um {{uhrzeit}} Uhr, {{ort}}, ist bestätigt.

Gerne kümmere ich mich um Ihr Anliegen — bringen Sie bei Bedarf die relevanten Unterlagen mit. Bei Verhinderung bitte ich um kurze Rückmeldung.

Ich freue mich auf unser Gespräch.'),

(null, 'service', 'erinnerung_1tag', 'Erinnerung: Ihr Termin morgen',
'Guten Tag {{vorname}},

kurze Erinnerung an Ihren Termin morgen, {{datum}}, um {{uhrzeit}} Uhr, {{ort}}.

Bis morgen.'),

(null, 'service', 'erinnerung_2std', 'In Kürze: Ihr Termin',
'Guten Tag {{vorname}},

Ihr Termin beginnt heute um {{uhrzeit}} Uhr, {{ort}}.

Bis gleich!');
