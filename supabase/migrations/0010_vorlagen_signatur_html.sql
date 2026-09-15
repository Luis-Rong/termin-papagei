-- Phase 6: Vorlagen und Signatur werden von Plain-Text auf HTML umgestellt
-- (Rich-Text-Editor: Textfarbe, Bilder in der Signatur) und ein öffentlicher
-- Storage-Bucket für Logo/Banner in der Signatur kommt dazu.
-- Ausführen im Supabase-Dashboard unter "SQL Editor" → "New query" → einfügen → "Run".

-- Bestehende Systemvorlagen (und eigene, falls schon angelegt) waren reiner
-- Plain-Text mit Leerzeile zwischen Absätzen. Ohne diese Umwandlung würden
-- alle Absätze nach der Umstellung auf HTML zu einer Zeile zusammenfallen.
-- Guard `!~ '^<p>'` macht die Migration ungefährlich, falls sie versehentlich
-- ein zweites Mal läuft.
update public.templates
set body = '<p>' || regexp_replace(
  regexp_replace(
    replace(replace(replace(body, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
    E'\n\n+', '</p><p>', 'g'
  ),
  E'\n', '<br>', 'g'
) || '</p>'
where body !~ '^<p>';

update public.profiles
set signature = '<p>' || regexp_replace(
  regexp_replace(
    replace(replace(replace(signature, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
    E'\n\n+', '</p><p>', 'g'
  ),
  E'\n', '<br>', 'g'
) || '</p>'
where signature is not null and signature !~ '^<p>';

comment on column public.templates.body is
  'HTML statt Plain-Text (seit 0010): Rich-Text-Editor erlaubt Textfarbe und '
  'Formatierung. Platzhalter {{vorname}}, {{datum}}, {{uhrzeit}}, {{ort}} werden '
  'beim Versand durch die echten Termindaten ersetzt, danach personalisiert das '
  'LLM nur noch die Formulierung, nie die HTML-Struktur oder die Platzhalterwerte. '
  'Die Signatur (profiles.signature) hängt automatisch darunter.';

comment on column public.profiles.signature is
  'HTML statt Plain-Text (seit 0010): Rich-Text-Editor erlaubt Textfarbe und ein '
  'Logo/Banner-Bild (Bucket signatur-bilder). Hängt automatisch unter jede Mail, '
  'die dieser Vermittler verschickt. Leer ist erlaubt.';

-- Öffentlicher Bucket für Signatur-Bilder: Kunden-Mailprogramme laden das
-- Logo/Banner ohne Anmeldung, deshalb public statt über RLS freigeschaltet.
insert into storage.buckets (id, name, public)
values ('signatur-bilder', 'signatur-bilder', true)
on conflict (id) do nothing;

-- Hochladen und Löschen nur im eigenen Ordner ({user_id}/...) — Lesen ist bei
-- einem public Bucket automatisch offen und braucht keine eigene Policy.
drop policy if exists "signatur_bilder_insert_eigener_ordner" on storage.objects;
create policy "signatur_bilder_insert_eigener_ordner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'signatur-bilder'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "signatur_bilder_update_eigener_ordner" on storage.objects;
create policy "signatur_bilder_update_eigener_ordner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'signatur-bilder'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "signatur_bilder_delete_eigener_ordner" on storage.objects;
create policy "signatur_bilder_delete_eigener_ordner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'signatur-bilder'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
