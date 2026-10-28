# Übergabe an Luis: Front-End-Runde vom 28.10.2026

Branch `feature/corporate-design` in Marts Klon, noch nicht committet. Zwei Runden an einem Tag:
erst das komplette Corporate Design von Masangkay & Partner, abends die Funktionsliste von Mart.
Luis arbeitet parallel lokal am Backend. Diese Notiz sagt exakt, was beim Zusammenführen
ergänzt, geprüft oder übernommen werden muss. Build (`npm run build`), `tsc` und `eslint`
laufen auf diesem Stand ohne Fehler.

## 1. Datenbank: Migration `supabase/migrations/0016_terminarten_erweitert.sql` (MUSS laufen)

Einmal im Supabase-Dashboard ausführen (SQL Editor → New query → Inhalt einfügen → Run).
Ohne sie melden Termine, Kunden, Vorlagen und Übersicht „column … does not exist".
Alles ist additiv (neue Spalten mit Defaults), alter Code läuft damit weiter.

| Tabelle | Neu / geändert |
|---|---|
| `appointments` | `location` erlaubt jetzt `buero`, `digital`, `telefon`, `anderer` (Constraint `appointments_location_check` neu). Neue Spalten: `ort_strasse text`, `ort_plz_ort text` (nur bei `anderer`), `nutzen text[] default '{}'` (max. 3, Constraint `appointments_nutzen_max_drei`), je Erinnerung `erinnerung_1tag_modus` / `erinnerung_2std_modus` (`vorlauf` oder `uhrzeit`, Default `vorlauf`), `erinnerung_1tag_tage_vorher` / `erinnerung_2std_tage_vorher` (0–7, Default 0), `erinnerung_1tag_uhrzeit` / `erinnerung_2std_uhrzeit` (`time`, Default 09:00). Die bisherigen `*_aktiv` und `*_stunden_vorher` bleiben. |
| `customers` | `anrede text default 'du'` (`du`/`sie`), `anrede_titel text` (`herr`/`frau`, nur beim Sie). Constraint `customers_anrede_check`. Telefon ist fachlich optional; die DB-Regel „E-Mail oder Telefon" bleibt. |
| `profiles` | `nutzen_eigene text[] default '{}'` — eigene Nutzen des Vermittlers für den Betreff. |
| `templates` | `appointment_type` erlaubt zusätzlich `telefon` und `sonstige`; `purpose` zusätzlich `sonstige`; neue Spalte `anrede text default 'du'` (`du`/`sie`). **Alle Standardvorlagen (`owner_id is null`) werden gelöscht und durch 36 neue ersetzt** (6 Bereiche × 3 Zwecke × Du/Sie). Eigene Vorlagen bleiben unverändert (laufen als `du`). |
| Funktion `termin_zusage_laden(text)` | Wird gedroppt und neu angelegt — Rückgabe hat jetzt die Spalte `adresse` (Straße, PLZ Ort zusammengesetzt). Rechte für `anon`/`authenticated` werden neu vergeben. |

Wer `supabase/migrations` lokal nachspielt: 0016 setzt 0006 (Erinnerungen) und 0014 (Zusage) voraus.

## 2. Fachregeln, die der Backend-Code kennen muss

- **Ort `telefon`** ist ein Ort, keine Terminart. Vorlagenwahl: zuerst Bereich `telefon`, sonst Terminart (`vorlageLaden` in `src/lib/vorlagen/abfragen.ts`, neue Signatur `(supabase, userId, terminart, zweck, anrede, telefon)`). Kalender-Ort „Telefon", `{{ort}}` = „telefonisch". Kein Meet-Link.
- **Ort `anderer`** braucht `ort_strasse` und/oder `ort_plz_ort`; `adresseZusammen()` baut „Straße 1, 12345 Ort". Steht so im Kalender, in der .ics, im Google-Link, auf der Zusage-Seite und in `{{ort}}` („vor Ort (…)").
- **Nutzen:** `appointments.nutzen` ist eine geordnete Liste (max. 3, je max. 40 Zeichen). `betreffMitNutzen()` hängt sie an **jeden** Betreff zum Termin an: „Termin mit Mart Masangkay – Vorsorge-Check, Investment" (Gedankenstrich, Komma-Liste). Gilt für Bestätigung und beide Erinnerungen. Feste Liste `NUTZEN_VORGABEN` in `src/lib/termine/terminarten.ts`, eigene in `profiles.nutzen_eigene` (Server Actions `nutzenHinzufuegen` / `nutzenEntfernen` in `termine/actions.ts`, werden direkt aus dem Client aufgerufen, nicht per Formular).
- **Erinnerungen:** Typ `ErinnerungsEinstellung { aktiv, modus, stunden, tage, uhrzeit }` (`terminarten.ts`, Hilfsfunktion `erinnerungAus(...)` aus den fünf Spalten). Fälligkeit rechnet **nur** `faelligkeit()` in `src/lib/erinnerungen/plan.ts`: `vorlauf` = Beginn minus Stunden; `uhrzeit` = `zeitpunktAmTag(beginn, tage, uhrzeit)` (Berliner Zeit). Liegt der Zeitpunkt nach dem Beginn → „entfällt". `PlanTermin` hat jetzt `erinnerung1` / `erinnerung2` statt der vier Einzelfelder. Der Job (`src/lib/erinnerungen/index.ts`) liest die neuen Spalten und die Kundenanrede mit.
- **Vorgaben je Ort** (`erinnerungsVorgaben(ort)`): Standard 24 h und 2 h Vorlauf; Telefon = 1. Erinnerung „am Termintag 09:00", 2. Erinnerung 1 h vorher. Nur Vorbelegung im Formular, die DB speichert immer die konkreten Werte.
- **Berater-Kalender:** Jeder Google-Event bekommt `reminders.overrides` Popup 1440 und 120 Minuten (`src/lib/kalender/google/events.ts`, Konstante `BERATER_ERINNERUNGEN_MINUTEN`).
- **Du/Sie:** `customers.anrede` entscheidet den Vorlagensatz (`templates.anrede`). `anredeName()` in `src/lib/termine/mail.ts`: Du → Vorname, Sie → „Herr/Frau Nachname" (nie Vorname). Formularregel: beim Sie ist Herr/Frau Pflicht (`src/lib/kunden/formular.ts`, geteilt von Kunden- und Terminformular).
- **Platzhalter** in Betreff und Text: `{{vorname}}`, `{{nachname}}`, `{{anrede}}`, `{{berater}}` (Vor- und Nachname aus `profiles`), `{{tag}}` (Wochentag; mehr als 7 Tage entfernt → „Dienstag, den 11.11."; `tagImSatz()` in `zeit.ts` hängt an „jetzt" — beim Versand berechnen, nicht beim Anlegen), `{{datum}}`, `{{uhrzeit}}`, `{{ort}}`. `platzhalterWerte(zeile, kunde, berater, jetzt)` hat eine neue Signatur: Kunde braucht `vorname, nachname, anrede, anredeTitel`; Termin braucht `location, starts_at, ort_strasse, ort_plz_ort`. `bestaetigungBetreff` / `erinnerungBetreff` nehmen als vierten Parameter die Nutzen.
- **Betreffe der Standardvorlagen** (Marts Vorgabe): Erstgespräch „Termin mit {{berater}}"; Beratung/Umsetzung/After-Sales/Service „Unser Gespräch am {{tag}}"; Telefon „Wir sprechen am {{tag}} um {{uhrzeit}} Uhr (telefonisch)", Erinnerungen „Heute sprechen wir um {{uhrzeit}} Uhr! – Telefontermin mit {{berater}}" (1.) und „In 1 Stunde sprechen wir! – Telefontermin mit {{berater}}" (2.).
- **Dauer:** Vorschläge 10, 30, 45, 60, 90, 120 Minuten (3 Std ist raus). Server akzeptiert weiterhin jede Dauer bis 24 h.
- **Neuer Kunde im Terminformular:** Feld `kundeModus=neu` plus `neuVorname, neuNachname, neuEmail, neuTelefon, neuAnrede, neuAnredeTitel`. `terminAnlegen` prüft erst alles, legt dann den Kunden an (Herkunft = Partner des Termins), dann den Termin. Beim Bearbeiten gibt es das nicht.
- **Bestätigung sofort senden** ist im Formular vorangekreuzt (`sofortSenden=on`), Serverlogik unverändert.
- **Vorlagen:** `vorlageKopieren` kopiert jetzt auch eigene Vorlagen und bleibt auf `/vorlagen` (kein Redirect zum Bearbeiten). Formularfelder heißen `bereich` (statt `terminart`), `zweck`, `anrede`, `betreff`, `text`; bei `bereich=sonstige` ist `zweck=sonstige`.
- **Zurückweg:** `/einstellungen?zurueck=/vorlagen` zeigt oben einen Zurück-Link; nur Pfade, die mit `/` beginnen, werden akzeptiert.

## 3. Formularfelder (FormData) der Terminaktion — vollständig

`kunde | kundeModus | neuVorname | neuNachname | neuEmail | neuTelefon | neuAnrede | neuAnredeTitel | terminart | ort | ortStrasse | ortPlzOrt | nutzen (mehrfach, geordnet) | datum | uhrzeit (HH:MM) | dauer (Minuten) | partner | notizen | vorbereitungDatum | vorbereitungUhrzeit | vorbereitungDauer | erinnerung1Aktiv (on) | erinnerung1Modus | erinnerung1Stunden | erinnerung1Tage | erinnerung1Uhrzeit | erinnerung2Aktiv | erinnerung2Modus | erinnerung2Stunden | erinnerung2Tage | erinnerung2Uhrzeit | sofortSenden (on)`

Die alten Feldnamen `erinnerung1TagAktiv`, `erinnerung1TagStunden`, `erinnerung2StdAktiv`, `erinnerung2StdStunden` gibt es nicht mehr.

## 4. Geänderte Typen und Signaturen (Konfliktpunkte beim Merge)

| Datei | Was sich geändert hat |
|---|---|
| `src/lib/termine/terminarten.ts` | `ORTE` + `ORT_REIHENFOLGE` mit `telefon`/`anderer`; `ORT_IM_SATZ` → Funktion `ortImSatz(ort, adresse)`; neu: `TERMINART_GRUPPEN`, `adresseZusammen`, `ErinnerungsModus`, `ErinnerungsEinstellung`, `erinnerungAus`, `erinnerungsVorgaben`, `ERINNERUNG_TAGE_MAX`, `NUTZEN_VORGABEN`, `NUTZEN_MAX`, `NUTZEN_ZEICHEN_MAX`, `betreffMitNutzen`; `DAUER_VORSCHLAEGE` neu; `dauerLabel` kürzer („1 Std", „30 Min"). |
| `src/lib/vorlagen/typen.ts` | `ZWECKE` umbenannt („1. Erinnerung", „2. Erinnerung") + `sonstige`; neu `ANREDEN`, `ANREDE_TITEL`, `VORLAGEN_BEREICHE`, `VORLAGEN_BEREICH_REIHENFOLGE`, `PLATZHALTER`, Typen `Anrede`, `AnredeTitel`, `VorlagenBereich`. Importiert jetzt `TERMINARTEN`. |
| `src/lib/vorlagen/abfragen.ts` | `Vorlage` hat `bereich` (statt `terminart`) und `anrede`; `vorlageLaden(…, anrede, telefon)`; `PlatzhalterWerte` mit 8 Feldern. |
| `src/lib/termine/mail.ts` | neue Typen `MailKunde`, `MailTermin`; `anredeName`, `beraterName`; `platzhalterWerte(zeile, kunde, berater, jetzt)`; Betreff-Funktionen mit Nutzen-Parameter. |
| `src/lib/termine/abfragen.ts` | `Termin` hat `ortStrasse`, `ortPlzOrt`, `ortAdresse`, `nutzen`, `erinnerung1`, `erinnerung2` (statt vier Einzelfelder); `FELDER` erweitert. |
| `src/lib/termine/kundenlinks.ts` | `KundenTermin.adresse?`; `kundenTerminOrt` kennt alle vier Orte. |
| `src/lib/termine/zusage.ts` | liest `adresse` aus der DB-Funktion. |
| `src/lib/erinnerungen/plan.ts` | `PlanTermin.erinnerung1/2`; `faelligkeit(beginn, einstellung)` exportiert; Grund-Texte angepasst. |
| `src/lib/erinnerungen/index.ts` | liest neue Spalten + `anrede`, `anrede_titel` der Kunden; ruft `vorlageLaden` mit Anrede/Telefon; Betreff mit Nutzen. |
| `src/lib/kalender/google/events.ts` | `reminders` im Event-Körper. |
| `src/lib/zeit.ts` | neu `STUNDEN_AUSWAHL`, `MINUTEN_AUSWAHL`, `UHRZEIT_MUSTER`, `normalisiereUhrzeit`, `tagImSatz`, `zeitpunktAmTag`; `FRUEHESTE_STUNDE`/`SPAETESTE_STUNDE` exportiert. |
| `src/lib/kunden/formular.ts` (neu) | `KundenWerte`, `kundenWerteLesen(formData, praefix)`, `kundenPruefen`, `kundenDatensatz`. |
| `src/app/(app)/kunden/actions.ts` | nutzt `src/lib/kunden/formular.ts`; `KundenWerte` wird re-exportiert. |
| `src/app/(app)/termine/actions.ts` | `terminPruefen(…, neuerKunde)`, `erinnerungenPruefen` neu, `kalenderOrt`, `MAIL_FELDER`, `profilLaden`, `nutzenAus`; neue Actions `nutzenHinzufuegen`, `nutzenEntfernen`. |
| `src/app/(app)/vorlagen/actions.ts` | Felder `bereich`/`anrede`; `vorlageKopieren` ohne Redirect, auch für eigene. |

## 5. Oberfläche (nur zur Orientierung, kein Backend-Bedarf)

Gestaltung komplett nach dem Corporate Design M&P (Tokens in `src/app/globals.css`, Bausteine in `src/components/ui/`). Neue Komponenten: `ui/stufen.tsx` (mit Trenner, `StufenLinks` für Filter), `ui/schalter.tsx`, `ui/rad.tsx` (Rad wie am Wecker), `ui/platzhalter-menue.tsx`, `ui/aufklappen`, `ui/dialog`, `ui/feld`, `ui/karte`, `ui/kennzahl`, `ui/liste`, `ui/logo`, `ui/meldung`, `ui/schild`, `ui/seitenkopf`; `app/uhrzeit-feld.tsx`, `app/erinnerung-feld.tsx`, `app/nutzen-auswahl.tsx`, `app/kunden-felder.tsx`, `app/termin-zeile.tsx`, `app/benutzer-leiste.tsx`. Entfernt: `ui/alert`, `badge`, `card`, `dropdown-menu`, `separator`, `app/benutzer-menue`, Next-Standard-SVGs, `favicon.ico` (jetzt `src/app/icon.svg`). Terminliste mit Zählern je Terminart und Filter Team/ich/Partner über Query-Parameter `wer` und `art`.

## 6. Offen / zu klären mit Mart

- Migration 0016 ausführen (siehe 1), danach Terminliste, Terminanlage, Kunden und Vorlagen einmal durchspielen.
- `src/app/zusage/[token]/page.tsx` siezt nicht mehr: Die Zusage-Seite duzt den Kunden; bei Sie-Kunden wäre eine Variante denkbar (nicht gebaut).
- Reminder-Job: `laengsterVorlaufStunden` begrenzt die Abfrage auf 168 h; der Modus `uhrzeit` kann maximal 7 Tage vorher liegen, passt also.
- Online-Gang (papagei.masangkay.de auf Marts Hetzner-Server) ist weiter offen.

## 7. Nachtrag Runde 3 (gleicher Abend) — Migration `0017_erinnerungen_mehr.sql` (MUSS laufen, nach 0016)

| Tabelle | Neu / geändert |
|---|---|
| `appointments` | `erinnerungen_weitere jsonb default '[]'` — Erinnerung 3 bis 5 als Liste (`{aktiv, modus, stunden, tage, uhrzeit}`), höchstens 3 Einträge. Erinnerung 1 und 2 bleiben in ihren Spalten. Vorlauf bis **336 h** (2 Wochen), `tage_vorher` bis 14 (Constraints neu). |
| `email_log` | `purpose` zusätzlich `erinnerung_3`, `erinnerung_4`, `erinnerung_5`. |
| `customers` | `first_name` und `last_name` nullable; Constraint `customers_name_vorhanden` (mindestens einer). App-Regel: nur Vorname → nur Du, nur Nachname → nur Sie (`kundenPruefen`). Überall `kundenName(first, last)` statt Template-Literal verwenden — `null` würde sonst als „null" erscheinen. |

Code dazu:
- `src/lib/erinnerungen/plan.ts`: `PlanTermin.erinnerungen: ErinnerungsEinstellung[]` (Index 0 = 1. Erinnerung), `KUNDEN_ERINNERUNGEN`, `erinnerungsLabel(art)`, `vorlagenZweckFuer(art)` (2. Erinnerung nutzt die „kurz vorher"-Vorlage, alle anderen die der 1. Erinnerung). Regel „spätere schon dran → frühere entfällt" gilt jetzt über alle Erinnerungen.
- `src/lib/termine/abfragen.ts`: `Termin.erinnerungen` (statt `erinnerung1/2`), `erinnerungenAusZeile(zeile)`, `nachTagenGruppieren(termine)`.
- `src/lib/termine/terminarten.ts`: `ERINNERUNGEN_MAX = 5`, `ERINNERUNG_WOCHEN_MAX = 2`, `erinnerungSatz`, `vorlaufTeile`, `vorlaufStunden`, `einheitWort` (Einzahl bei 1), `tagWort`, `erinnerungenAusListe`.
- `src/app/(app)/termine/actions.ts`: Formularfelder `erinnerung3…5*` werden nur gelesen, wenn `erinnerung<N>Modus` mitkommt; Ergebnis landet in `erinnerungen_weitere`.
- Oberfläche: Du/Sie als Pille „( per Du | per Sie )" (`ui/umschalter.tsx`), „Feste Uhrzeit" als Kippschalter (`ui/schalter.tsx`), Uhrzeit-Feld öffnet direkt die Räder mittig (`app/uhrzeit-feld.tsx`), Kundenauswahl mit Suche und Enter = oberster Treffer (`app/kunden-suche.tsx`), „Nutzen" heißt in der Oberfläche jetzt **Thema** (Datenbank bleibt `nutzen`), Themen-Tags kleiner, Reihenfolge im Formular: Erinnerungen vor Thema. Terminliste: alle Zähler auf einen Blick (Alle · Beratungsprozess mit Erstgespräche/Beratungen/Umsetzungen · Service mit After-Sales/Service-Termine), Filter über `?art=` (`alle`, `prozess`, `betreuung` oder Terminart), Liste nach Tagen gruppiert („Heute", „Morgen", Wochentag). Leiste: Übersicht = vier Quadrate, Kunden = eine Person, Partner = Handschlag nach Lucide „handshake“ mit abgerundeten Ärmeln (eigene Komponente).

## 8. Stand nach dem Merge (Luis, 28.10.2026)

- Branch `feature/frontend-merge` = `feature/corporate-design` + `main` (PR #21 Hetzner-Deployment,
  PR #22 KI abgeschaltet). **Keine Konflikte**; `CLAUDE.md` hat Git selbst zusammengeführt,
  beide Ergänzungen sind drin. `main` hatte seit dem Abzweig (`3115dc3`) nichts unter `src/`
  geändert — dem Front-End fehlt also kein Feld und keine Funktion aus dem Backend.
- **Migrationen 0016 und 0017 sind in der Datenbank eingespielt** (28.10.2026, in dieser
  Reihenfolge): 36 Standardvorlagen (18 Du, 18 Sie), alle neuen Spalten vorhanden. Eigene
  Migrationen bringt der Backend-Stand nicht mit; die Nummern bleiben 0001–0017.
- Deployment unverändert passend: neue Logos liegen in `public/` und landen im Image
  (`.dockerignore` schließt nur die losen `Logo*`-Dateien im Hauptordner aus); Spectral lädt
  `next/font` beim Build bei GitHub Actions; keine neuen Umgebungsvariablen.
- Technik: `tsc`, `eslint src`, `npm run build`, `npm run cf:build` grün. Den Docker-Build
  prüft erst GitHub Actions beim Merge (lokal ist kein Docker installiert).
- Neu dazu: Favicon „Papagei" statt Monogramm (siehe `CLAUDE.md`, Design-Vorgaben).
- Fachliche Prüfung im Browser (Punkte 5–17 aus Marts Prüfliste): Ergebnis steht im PR.
