-- Front-End-Runde Okt 2026 (Mart): Telefontermin und freier Ort, Nutzen im
-- Betreff, Erinnerung zu fester Uhrzeit, Du/Sie je Kunde, Vorlagen je Anrede
-- sowie Telefon- und sonstige Vorlagen.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

-- ---------------------------------------------------------------------------
-- 1) Termine: Ort "telefon" und "anderer" (mit Adresse), Nutzen, Erinnerung
--    wahlweise als Vorlauf (Stunden vorher) oder zu fester Uhrzeit an einem Tag.
-- ---------------------------------------------------------------------------
alter table public.appointments drop constraint if exists appointments_location_check;
alter table public.appointments
  add constraint appointments_location_check
  check (location in ('buero', 'digital', 'telefon', 'anderer'));

alter table public.appointments
  add column if not exists ort_strasse text,
  add column if not exists ort_plz_ort text,
  -- Bis zu drei Nutzen in der gewählten Reihenfolge; hängen an jeden Betreff
  -- ("Termin mit Mart – Vorsorge-Check, Investment").
  add column if not exists nutzen text[] not null default '{}',
  -- 'vorlauf' = Stunden vor dem Termin (bisheriges Verhalten),
  -- 'uhrzeit' = an einem bestimmten Tag um eine feste Uhrzeit.
  add column if not exists erinnerung_1tag_modus text not null default 'vorlauf',
  add column if not exists erinnerung_1tag_tage_vorher smallint not null default 0,
  add column if not exists erinnerung_1tag_uhrzeit time not null default '09:00',
  add column if not exists erinnerung_2std_modus text not null default 'vorlauf',
  add column if not exists erinnerung_2std_tage_vorher smallint not null default 0,
  add column if not exists erinnerung_2std_uhrzeit time not null default '09:00';

alter table public.appointments drop constraint if exists appointments_nutzen_max_drei;
alter table public.appointments
  add constraint appointments_nutzen_max_drei
  check (coalesce(array_length(nutzen, 1), 0) <= 3);

alter table public.appointments drop constraint if exists appointments_erinnerung_modus;
alter table public.appointments
  add constraint appointments_erinnerung_modus
  check (erinnerung_1tag_modus in ('vorlauf', 'uhrzeit')
     and erinnerung_2std_modus in ('vorlauf', 'uhrzeit'));

alter table public.appointments drop constraint if exists appointments_erinnerung_tage;
alter table public.appointments
  add constraint appointments_erinnerung_tage
  check (erinnerung_1tag_tage_vorher between 0 and 7
     and erinnerung_2std_tage_vorher between 0 and 7);

comment on column public.appointments.ort_strasse is
  'Straße und Hausnummer, nur bei location = anderer.';
comment on column public.appointments.ort_plz_ort is
  'PLZ und Ort, nur bei location = anderer.';
comment on column public.appointments.nutzen is
  'Bis zu drei Nutzen in gewählter Reihenfolge; werden an jeden Betreff angehängt.';
comment on column public.appointments.erinnerung_1tag_modus is
  'vorlauf = erinnerung_1tag_stunden_vorher gilt; uhrzeit = erinnerung_1tag_tage_vorher + erinnerung_1tag_uhrzeit gelten.';
comment on column public.appointments.erinnerung_2std_modus is
  'vorlauf = erinnerung_2std_stunden_vorher gilt; uhrzeit = erinnerung_2std_tage_vorher + erinnerung_2std_uhrzeit gelten.';

-- Die Zusage-Seite des Kunden zeigt den Ort — bei "anderer" die Adresse.
-- Der Rückgabetyp ändert sich, deshalb erst entfernen (Rechte werden unten neu vergeben).
drop function if exists public.termin_zusage_laden(text);
create function public.termin_zusage_laden(p_token text)
returns table (
  terminart text,
  beginn timestamptz,
  ende timestamptz,
  ort text,
  meet_link text,
  status text,
  zugesagt_am timestamptz,
  vermittler text,
  firma text,
  adresse text
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
    p.company,
    nullif(trim(concat_ws(', ', nullif(trim(a.ort_strasse), ''), nullif(trim(a.ort_plz_ort), ''))), '')
  from public.appointments a
  join public.profiles p on p.id = a.owner_id
  where a.zusage_token = p_token
    and a.kind = 'kundentermin'
    and length(p_token) >= 32;
$$;

revoke all on function public.termin_zusage_laden(text) from public;
grant execute on function public.termin_zusage_laden(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Kunden: Du oder Sie. Bei Sie steht in den Mails nur "Herr/Frau Nachname".
-- ---------------------------------------------------------------------------
alter table public.customers
  add column if not exists anrede text not null default 'du',
  add column if not exists anrede_titel text;

alter table public.customers drop constraint if exists customers_anrede_check;
alter table public.customers
  add constraint customers_anrede_check
  check (anrede in ('du', 'sie') and (anrede_titel is null or anrede_titel in ('herr', 'frau')));

comment on column public.customers.anrede is 'du (Standard) oder sie — wählt den Vorlagensatz.';
comment on column public.customers.anrede_titel is 'herr oder frau — nur bei anrede = sie gebraucht ("Guten Tag Frau Mustermann").';

-- ---------------------------------------------------------------------------
-- 3) Profil: selbst angelegte Nutzen, zusätzlich zur festen Liste in der App.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists nutzen_eigene text[] not null default '{}';

comment on column public.profiles.nutzen_eigene is
  'Eigene Nutzen des Vermittlers für die Betreffzeile, zusätzlich zur festen Liste (src/lib/termine/terminarten.ts).';

-- ---------------------------------------------------------------------------
-- 4) Vorlagen: je Anrede ein Satz; Bereich "telefon" (gilt für jede Terminart,
--    die telefonisch stattfindet) und "sonstige" (freie eigene Vorlagen).
-- ---------------------------------------------------------------------------
alter table public.templates drop constraint if exists templates_appointment_type_check;
alter table public.templates
  add constraint templates_appointment_type_check
  check (appointment_type in
    ('erstgespraech', 'beratung', 'umsetzung', 'after_sales', 'service', 'telefon', 'sonstige'));

alter table public.templates drop constraint if exists templates_purpose_check;
alter table public.templates
  add constraint templates_purpose_check
  check (purpose in ('bestaetigung', 'erinnerung_1tag', 'erinnerung_2std', 'sonstige'));

alter table public.templates
  add column if not exists anrede text not null default 'du';

alter table public.templates drop constraint if exists templates_anrede_check;
alter table public.templates
  add constraint templates_anrede_check check (anrede in ('du', 'sie'));

comment on column public.templates.anrede is
  'du oder sie — beim Versand entscheidet die Anrede des Kunden, welcher Satz gilt.';

-- Bisherige Systemvorlagen (siezten und nutzten den Vornamen) werden ersetzt.
-- Eigene Vorlagen bleiben unangetastet; sie laufen weiter als "du".
delete from public.templates where owner_id is null;

-- Platzhalter: {{vorname}}, {{nachname}}, {{anrede}} (Du: Vorname — Sie: Herr/Frau Nachname),
-- {{berater}}, {{tag}} (Wochentag, bei mehr als einer Woche mit Datum),
-- {{datum}}, {{uhrzeit}}, {{ort}}. Die Nutzen des Termins hängt die App an den Betreff.
insert into public.templates (owner_id, anrede, appointment_type, purpose, subject, body) values

-- ============================== per Du ======================================
(null, 'du', 'erstgespraech', 'bestaetigung', 'Termin mit {{berater}}',
'<p>Hallo {{vorname}},</p><p>schön, dass wir uns kennenlernen. Unser Erstgespräch ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Wir schauen gemeinsam, wo du gerade stehst und was dir wichtig ist. Mitbringen musst du nichts.</p><p>Wenn dir etwas dazwischenkommt, gib mir kurz Bescheid.</p><p>Bis dahin!</p>'),
(null, 'du', 'erstgespraech', 'erinnerung_1tag', 'Erinnerung: Termin mit {{berater}} am {{tag}}',
'<p>Hallo {{vorname}},</p><p>kurze Erinnerung: Unser Erstgespräch ist am {{tag}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Ich freue mich auf dich.</p>'),
(null, 'du', 'erstgespraech', 'erinnerung_2std', 'In Kürze: Termin mit {{berater}} um {{uhrzeit}} Uhr',
'<p>Hallo {{vorname}},</p><p>unser Erstgespräch beginnt heute um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis gleich!</p>'),

(null, 'du', 'beratung', 'bestaetigung', 'Unser Gespräch am {{tag}}',
'<p>Hallo {{vorname}},</p><p>unser Beratungsgespräch ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Wir gehen gemeinsam durch, was zu dir passt, und du bekommst einen klaren Plan für die nächsten Schritte. Halte dir die Zeit bitte frei.</p><p>Wenn dir etwas dazwischenkommt, sag mir rechtzeitig Bescheid.</p><p>Bis dahin!</p>'),
(null, 'du', 'beratung', 'erinnerung_1tag', 'Erinnerung: unser Gespräch am {{tag}}',
'<p>Hallo {{vorname}},</p><p>kurze Erinnerung an unser Beratungsgespräch am {{tag}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis dann!</p>'),
(null, 'du', 'beratung', 'erinnerung_2std', 'In Kürze: unser Gespräch um {{uhrzeit}} Uhr',
'<p>Hallo {{vorname}},</p><p>unser Beratungsgespräch beginnt heute um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis gleich!</p>'),

(null, 'du', 'umsetzung', 'bestaetigung', 'Unser Gespräch am {{tag}}',
'<p>Hallo {{vorname}},</p><p>unser Termin zur Umsetzung ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Wir setzen die besprochenen Schritte gemeinsam um. Halte bitte die Unterlagen bereit, die wir abgesprochen haben.</p><p>Wenn dir etwas dazwischenkommt, sag mir rechtzeitig Bescheid.</p><p>Bis dahin!</p>'),
(null, 'du', 'umsetzung', 'erinnerung_1tag', 'Erinnerung: unser Gespräch am {{tag}}',
'<p>Hallo {{vorname}},</p><p>kurze Erinnerung an unseren Termin zur Umsetzung am {{tag}} um {{uhrzeit}} Uhr, {{ort}}. Denk bitte an die besprochenen Unterlagen.</p><p>Bis dann!</p>'),
(null, 'du', 'umsetzung', 'erinnerung_2std', 'In Kürze: unser Gespräch um {{uhrzeit}} Uhr',
'<p>Hallo {{vorname}},</p><p>unser Termin zur Umsetzung beginnt heute um {{uhrzeit}} Uhr, {{ort}}. Halte die besprochenen Unterlagen bitte bereit.</p><p>Bis gleich!</p>'),

(null, 'du', 'after_sales', 'bestaetigung', 'Unser Gespräch am {{tag}}',
'<p>Hallo {{vorname}},</p><p>unser Gespräch ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Wir schauen gemeinsam, ob deine Lösungen noch zu deiner aktuellen Situation passen und ob sich etwas verbessern lässt.</p><p>Wenn dir etwas dazwischenkommt, sag mir rechtzeitig Bescheid.</p><p>Bis dahin!</p>'),
(null, 'du', 'after_sales', 'erinnerung_1tag', 'Erinnerung: unser Gespräch am {{tag}}',
'<p>Hallo {{vorname}},</p><p>kurze Erinnerung an unser Gespräch am {{tag}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis dann!</p>'),
(null, 'du', 'after_sales', 'erinnerung_2std', 'In Kürze: unser Gespräch um {{uhrzeit}} Uhr',
'<p>Hallo {{vorname}},</p><p>unser Gespräch beginnt heute um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis gleich!</p>'),

(null, 'du', 'service', 'bestaetigung', 'Unser Gespräch am {{tag}}',
'<p>Hallo {{vorname}},</p><p>unser Servicetermin ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Ich kümmere mich um dein Anliegen. Bring gern die Unterlagen mit, um die es geht.</p><p>Wenn dir etwas dazwischenkommt, sag mir rechtzeitig Bescheid.</p><p>Bis dahin!</p>'),
(null, 'du', 'service', 'erinnerung_1tag', 'Erinnerung: unser Gespräch am {{tag}}',
'<p>Hallo {{vorname}},</p><p>kurze Erinnerung an unseren Servicetermin am {{tag}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis dann!</p>'),
(null, 'du', 'service', 'erinnerung_2std', 'In Kürze: unser Gespräch um {{uhrzeit}} Uhr',
'<p>Hallo {{vorname}},</p><p>unser Servicetermin beginnt heute um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis gleich!</p>'),

(null, 'du', 'telefon', 'bestaetigung', 'Wir sprechen am {{tag}} um {{uhrzeit}} Uhr (telefonisch)',
'<p>Hallo {{vorname}},</p><p>ich rufe dich am {{datum}} um {{uhrzeit}} Uhr an.</p><p>Halte dir die Zeit bitte frei und sorg dafür, dass du in Ruhe sprechen kannst.</p><p>Wenn dir etwas dazwischenkommt, sag mir kurz Bescheid.</p><p>Bis dahin!</p>'),
(null, 'du', 'telefon', 'erinnerung_1tag', 'Heute sprechen wir um {{uhrzeit}} Uhr! – Telefontermin mit {{berater}}',
'<p>Hallo {{vorname}},</p><p>heute um {{uhrzeit}} Uhr rufe ich dich an. Halte dir die Zeit bitte frei.</p><p>Bis später!</p>'),
(null, 'du', 'telefon', 'erinnerung_2std', 'In 1 Stunde sprechen wir! – Telefontermin mit {{berater}}',
'<p>Hallo {{vorname}},</p><p>in einer Stunde, um {{uhrzeit}} Uhr, rufe ich dich an.</p><p>Bis gleich!</p>'),

-- ============================== per Sie =====================================
(null, 'sie', 'erstgespraech', 'bestaetigung', 'Termin mit {{berater}}',
'<p>Guten Tag {{anrede}},</p><p>schön, dass wir uns kennenlernen. Unser Erstgespräch ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Wir schauen gemeinsam, wo Sie gerade stehen und was Ihnen wichtig ist. Mitbringen müssen Sie nichts.</p><p>Sollte der Termin nicht passen, geben Sie mir bitte kurz Bescheid.</p><p>Ich freue mich auf unser Gespräch.</p>'),
(null, 'sie', 'erstgespraech', 'erinnerung_1tag', 'Erinnerung: Termin mit {{berater}} am {{tag}}',
'<p>Guten Tag {{anrede}},</p><p>kurze Erinnerung: Unser Erstgespräch ist am {{tag}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Ich freue mich auf Sie.</p>'),
(null, 'sie', 'erstgespraech', 'erinnerung_2std', 'In Kürze: Termin mit {{berater}} um {{uhrzeit}} Uhr',
'<p>Guten Tag {{anrede}},</p><p>unser Erstgespräch beginnt heute um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis gleich!</p>'),

(null, 'sie', 'beratung', 'bestaetigung', 'Unser Gespräch am {{tag}}',
'<p>Guten Tag {{anrede}},</p><p>unser Beratungsgespräch ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Wir gehen gemeinsam durch, was zu Ihnen passt, und Sie bekommen einen klaren Plan für die nächsten Schritte. Bitte halten Sie sich die Zeit frei.</p><p>Sollte der Termin nicht passen, geben Sie mir bitte rechtzeitig Bescheid.</p><p>Ich freue mich auf unser Gespräch.</p>'),
(null, 'sie', 'beratung', 'erinnerung_1tag', 'Erinnerung: unser Gespräch am {{tag}}',
'<p>Guten Tag {{anrede}},</p><p>kurze Erinnerung an unser Beratungsgespräch am {{tag}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis dann.</p>'),
(null, 'sie', 'beratung', 'erinnerung_2std', 'In Kürze: unser Gespräch um {{uhrzeit}} Uhr',
'<p>Guten Tag {{anrede}},</p><p>unser Beratungsgespräch beginnt heute um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis gleich!</p>'),

(null, 'sie', 'umsetzung', 'bestaetigung', 'Unser Gespräch am {{tag}}',
'<p>Guten Tag {{anrede}},</p><p>unser Termin zur Umsetzung ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Wir setzen die besprochenen Schritte gemeinsam um. Bitte halten Sie die abgesprochenen Unterlagen bereit.</p><p>Sollte der Termin nicht passen, geben Sie mir bitte rechtzeitig Bescheid.</p><p>Ich freue mich auf unseren Termin.</p>'),
(null, 'sie', 'umsetzung', 'erinnerung_1tag', 'Erinnerung: unser Gespräch am {{tag}}',
'<p>Guten Tag {{anrede}},</p><p>kurze Erinnerung an unseren Termin zur Umsetzung am {{tag}} um {{uhrzeit}} Uhr, {{ort}}. Bitte denken Sie an die besprochenen Unterlagen.</p><p>Bis dann.</p>'),
(null, 'sie', 'umsetzung', 'erinnerung_2std', 'In Kürze: unser Gespräch um {{uhrzeit}} Uhr',
'<p>Guten Tag {{anrede}},</p><p>unser Termin zur Umsetzung beginnt heute um {{uhrzeit}} Uhr, {{ort}}. Bitte halten Sie die besprochenen Unterlagen bereit.</p><p>Bis gleich!</p>'),

(null, 'sie', 'after_sales', 'bestaetigung', 'Unser Gespräch am {{tag}}',
'<p>Guten Tag {{anrede}},</p><p>unser Gespräch ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Wir schauen gemeinsam, ob Ihre Lösungen noch zu Ihrer aktuellen Situation passen und ob sich etwas verbessern lässt.</p><p>Sollte der Termin nicht passen, geben Sie mir bitte rechtzeitig Bescheid.</p><p>Ich freue mich auf unser Gespräch.</p>'),
(null, 'sie', 'after_sales', 'erinnerung_1tag', 'Erinnerung: unser Gespräch am {{tag}}',
'<p>Guten Tag {{anrede}},</p><p>kurze Erinnerung an unser Gespräch am {{tag}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis dann.</p>'),
(null, 'sie', 'after_sales', 'erinnerung_2std', 'In Kürze: unser Gespräch um {{uhrzeit}} Uhr',
'<p>Guten Tag {{anrede}},</p><p>unser Gespräch beginnt heute um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis gleich!</p>'),

(null, 'sie', 'service', 'bestaetigung', 'Unser Gespräch am {{tag}}',
'<p>Guten Tag {{anrede}},</p><p>unser Servicetermin ist am {{datum}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Ich kümmere mich um Ihr Anliegen. Bringen Sie gern die Unterlagen mit, um die es geht.</p><p>Sollte der Termin nicht passen, geben Sie mir bitte rechtzeitig Bescheid.</p><p>Ich freue mich auf unser Gespräch.</p>'),
(null, 'sie', 'service', 'erinnerung_1tag', 'Erinnerung: unser Gespräch am {{tag}}',
'<p>Guten Tag {{anrede}},</p><p>kurze Erinnerung an unseren Servicetermin am {{tag}} um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis dann.</p>'),
(null, 'sie', 'service', 'erinnerung_2std', 'In Kürze: unser Gespräch um {{uhrzeit}} Uhr',
'<p>Guten Tag {{anrede}},</p><p>unser Servicetermin beginnt heute um {{uhrzeit}} Uhr, {{ort}}.</p><p>Bis gleich!</p>'),

(null, 'sie', 'telefon', 'bestaetigung', 'Wir sprechen am {{tag}} um {{uhrzeit}} Uhr (telefonisch)',
'<p>Guten Tag {{anrede}},</p><p>ich rufe Sie am {{datum}} um {{uhrzeit}} Uhr an.</p><p>Bitte halten Sie sich die Zeit frei und sorgen Sie dafür, dass Sie in Ruhe sprechen können.</p><p>Sollte der Termin nicht passen, geben Sie mir bitte kurz Bescheid.</p><p>Ich freue mich auf unser Gespräch.</p>'),
(null, 'sie', 'telefon', 'erinnerung_1tag', 'Heute sprechen wir um {{uhrzeit}} Uhr! – Telefontermin mit {{berater}}',
'<p>Guten Tag {{anrede}},</p><p>heute um {{uhrzeit}} Uhr rufe ich Sie an. Bitte halten Sie sich die Zeit frei.</p><p>Bis später.</p>'),
(null, 'sie', 'telefon', 'erinnerung_2std', 'In 1 Stunde sprechen wir! – Telefontermin mit {{berater}}',
'<p>Guten Tag {{anrede}},</p><p>in einer Stunde, um {{uhrzeit}} Uhr, rufe ich Sie an.</p><p>Bis gleich!</p>');
