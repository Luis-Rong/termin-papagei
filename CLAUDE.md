@AGENTS.md

# Termin Tiger — Projektspezifikation

Terminierungs-Tool für Finanzdienstleister (Versicherungsvermittler nach §34d/§34f GewO).
Web-App, mit der Vermittler Kundentermine anlegen und vollautomatisch personalisierte
Einladungen und Erinnerungen verschicken — inkl. Google-Kalender- und Google-Meet-Integration
sowie einem Partner-Netzwerk zwischen Vermittlern.

## Zielgruppe & Kernidee

- Nutzer: selbstständige Versicherungs-/Finanzvermittler ("Vertriebspartner"), jeder mit eigenem Account (E-Mail + Passwort) und unabhängigem Portal.
- Vermittler können sich gegenseitig über eine Suchfunktion finden und als Partner verbinden ("Freundesliste").
- Kunden können "eigene Kunden" sein oder "Kunde eines Vertriebspartners" (Auswahl aus der Freundesliste).

## Umfang & Betrieb (wichtig für alle Technik-Entscheidungen)

- **Nutzerzahl: ca. 10, maximal ~20**, falls das Tool auf das ganze Büro des Partners ausgeweitet wird.
- **Die Anwendung wird vorerst nicht verkauft** — interne Nutzung durch die Vermittler selbst, keine Registrierung durch Fremde, kein Bezahlmodell, keine Abrechnungslogik.
- Daraus folgt konkret:
  - Keine Skalierungs-Optimierung nötig (Caching, Sharding, Rate-Limits etc. sind Overkill).
  - **Google-OAuth-Verifizierung ist nicht erforderlich** — die 100-Nutzer-Grenze für nicht verifizierte Apps reicht dauerhaft (siehe Tech-Stack-Hinweise).
  - Registrierung sollte trotzdem geschützt sein (Einladungscode oder manuelle Freischaltung), damit sich keine Fremden anmelden.
  - **DSGVO bleibt trotzdem voll relevant**: verarbeitet werden echte Kundendaten von Versicherungskunden.
  - Es gibt **kein öffentliches Angebot** → Impressumspflicht entfällt weitgehend; eine Datenschutzerklärung/interne Datenschutzinfo wird dennoch gebraucht (auch für den Google-OAuth-Zustimmungsbildschirm).

## Haupt-Ablauf (Kernfunktion)

1. **Kunde anlegen**: Vorname, Nachname, Telefon, E-Mail; eigener Kunde oder Kunde eines Partners (Partner aus Freundesliste wählen).
2. **Termin anlegen**: Terminart, vor Ort im Büro oder digital, Datum/Uhrzeit, Notizen, E-Mail-Vorlage wählen.
3. **Kalender**: Termin landet im Google-Kalender des Vermittlers und ggf. des beteiligten Partners.
4. **Digital-Termine**: Google-Meet-Link wird im Kalender-Event erzeugt und in die Bestätigungs-Mail eingefügt.
5. **E-Mails**: Terminbestätigung sofort; je Terminart zusätzlich Erinnerung 1 Tag vorher. Vorlagen wählbar, bearbeitbar, neue anlegbar. Ein LLM personalisiert die Mail, hält sich aber streng an die Vorlage. Vorschau vor Versand.
6. **Vorbereitungstermine** (nur eigener Kalender, unabhängig vom Kunden — siehe Tabelle).

## Terminarten & Regeln

| Terminart | Bestätigung an Kunden | Erinnerung 1 Tag vorher an Kunden | Zusatzregel |
|---|---|---|---|
| Erstgespräch | ja | ja | — |
| Beratung | ja | ja | Individueller **Vorbereitungstermin** wird zusätzlich vereinbart (eigener Kalender, je nach Situation auch Kalender des Partners) |
| Umsetzung | ja | ja | Immer 1 Tag vorher **Erinnerung an den Vermittler**, den Kunden anzurufen |
| After-Sales | ja | konfigurierbar | — |
| Service | ja | konfigurierbar | — |

Weitere Funktion: Liste aller Termine — editieren, löschen, Notizen hinzufügen, Status.

## Tech-Stack (entschieden)

| Baustein | Wahl |
|---|---|
| Framework | Next.js (App Router, TypeScript, `src/`-Verzeichnis), Tailwind CSS v4, shadcn/ui |
| Datenbank + Auth | Supabase, Region **Frankfurt (EU)** — E-Mail/Passwort-Auth, Postgres mit Row Level Security |
| Kalender | Google Calendar API, OAuth pro Nutzer; Meet-Link via `conferenceData` |
| E-Mail | Resend, hinter einer eigenen Abstraktion `src/lib/email/` — Anbieterwechsel muss eine Ein-Datei-Änderung bleiben |
| LLM | Claude API, Modell `claude-haiku-4-5`, niedrige Temperatur, strikte Vorlagen-Treue |
| Erinnerungen | Supabase pg_cron + Edge Function, täglicher Lauf (Europe/Berlin) |
| Hosting | Entwicklung lokal; Deployment Vercel (Go-Live: Pro-Plan nötig, siehe unten) |

Zeitzone immer **Europe/Berlin**. DSGVO beachten: EU-Region, strikte RLS, an die
Claude-API nur das Nötigste senden (Name, Terminart, Datum — nie Finanzdaten).

### Verbindliche Betriebs-Entscheidungen

- **Google OAuth: Publishing-Status „In Produktion", NICHT „Testing".**
  Im Testing-Modus laufen Refresh-Tokens nach **7 Tagen** ab — jeder Nutzer müsste
  wöchentlich neu verbinden und der nächtliche Erinnerungs-Job würde reihenweise brechen.
  In Produktion ohne Verifizierung gilt: einmaliger Warnbildschirm („Erweitert" →
  „Weiter zu …") und ein Limit von 100 Nutzern insgesamt — bei ~20 Nutzern dauerhaft unkritisch.
  **Entschieden (Aug 2026):** Das Büro nutzt **kein** Google Workspace. Damit fällt der
  User-Type „Internal" weg — es gilt **External + In Produktion**.
- **Das Tool ist an keinen E-Mail-Anbieter gebunden.** Drei Dinge, die oft verwechselt
  werden und strikt getrennt bleiben:
  - *Login ins Tool*: Supabase, E-Mail + Passwort, beliebige Adresse. Google spielt hier
    keine Rolle und darf nie zur Voraussetzung werden.
  - *Kalender verbinden*: braucht ein **Google-Konto**, aber **keine `@gmail.com`-Adresse** —
    ein Google-Konto lässt sich mit jeder bestehenden Adresse anlegen. Auch der Meet-Link
    über `conferenceData` funktioniert mit privaten Google-Konten, Workspace ist nicht nötig.
  - *Mails an Kunden*: Resend, gehen an jede Adresse.
- **Die Google-Verbindung ist optional, nicht Voraussetzung.** Wer sie nicht einrichtet
  (z. B. reine Outlook-Nutzer), verliert nur die Kalender-Synchronisation — Login, Kunden,
  Partner, Termine und Mails funktionieren unverändert. Die Oberfläche darf einen Termin
  also nie am fehlenden Kalender scheitern lassen.
- **Vercel Hobby ist für den Produktivbetrieb nicht zulässig** (interne Firmen-Tools zählen
  laut Vercel als kommerzielle Nutzung, auch ohne Verkauf). Entwicklung auf Hobby ist okay,
  ab Go-Live Vercel Pro (~20 $/Monat).
- **Mail-Volumen im Blick behalten:** Resend Free = 100 Mails/Tag. Bei ~20 aktiven Vermittlern
  mit je 3 Terminen/Tag (Bestätigung + Erinnerung) wird das knapp. Fallback ohne Codeumbau:
  Brevo (300 Mails/Tag frei, EU-Anbieter) oder Resend Pro.
- **Backups:** Der Supabase-Free-Tier hat **keine automatischen Backups**. Da echte
  Kundendaten verarbeitet werden, ist entweder Supabase Pro (tägliche Backups) oder ein
  eigener, geplanter Datenbank-Export Pflicht, bevor echte Kunden erfasst werden.
- **Registrierung absichern:** kein offenes Sign-up — Einladungscode oder manuelle Freischaltung.

## Datenmodell (Supabase/Postgres)

| Tabelle | Inhalt |
|---|---|
| `profiles` | 1:1 zu `auth.users` — Vorname, Nachname, Firma; Basis für Partnersuche |
| `partnerships` | requester_id, addressee_id, status (`pending`/`accepted`); ein Eintrag pro Paar |
| `customers` | owner_id, Vorname, Nachname, Telefon, E-Mail, source_partner_id (nullable) |
| `appointments` | owner_id, customer_id, partner_id (nullable), Terminart, Ort (`buero`/`digital`), starts_at/ends_at, Notizen, google_event_id, partner_google_event_id, meet_link, status, kind (`kundentermin`/`vorbereitung`), parent_appointment_id |
| `templates` | owner_id (`null` = Systemvorlage), Terminart, Zweck (`bestaetigung`/`erinnerung`), Betreff, Text |
| `google_connections` | user_id, verschlüsselter Refresh-Token, verbundene Google-Adresse |
| `email_log` | appointment_id, Empfänger, Zweck, sent_at — verhindert Doppelversand |

## Design-Vorgaben

Professionell, passend zum Finanzvertrieb.

- Schriften: Überschriften **Palatino** (`Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif`), Fließtext **Trebuchet MS** (`"Trebuchet MS", "Segoe UI", Tahoma, sans-serif`) — Systemschriften, kein Webfont-Loading.
- Hauptfarben: Dunkelblau `#101E47` (Primär), Beige `#E6DEBC` (Sekundär/Flächen).
- Nebenfarben: Rostrot `#912B1C`, Altrosa `#BE5D80`, Anthrazit `#27272F`.

## Arbeitsregeln (2-Personen-Team, wenig Git-Erfahrung)

- **Nie direkt auf `main` committen.** Für jede Aufgabe einen eigenen Branch (`feature/…`), dann Pull Request auf GitHub (`Luis-Rong/termin-tiger`), der andere schaut kurz drüber, dann mergen.
- Vor Arbeitsbeginn immer `git pull` auf `main` und den Feature-Branch davon abzweigen.
- `.env.local` und alle Secrets **niemals** committen (steht in `.gitignore`). Neue Umgebungsvariablen zusätzlich als Platzhalter in `.env.example` eintragen.
- Kleine, häufige Commits mit verständlicher Beschreibung.

## Roadmap-Status

0 Fundament ✅ → 1 Accounts/Login ✅ → 2 Kunden ✅ → 3 Partner-Netzwerk ✅ → 4 Termin-Wizard ✅ →
5 Google Kalender/Meet ✅ → 6 Vorlagen/E-Mail/LLM → 7 automatische Erinnerungen →
8 Feinschliff/Go-Live (braucht Namensentscheidung + Domain).

### Technische Konventionen

- **Next.js 16 nennt die frühere Middleware „Proxy"** — die Datei heißt `src/proxy.ts`.
  Anleitungen im Netz sprechen noch von `middleware.ts`; das funktioniert hier nicht.
- Datenbank-Änderungen immer als nummerierte SQL-Datei in `supabase/migrations/`
  ablegen (nie nur im Dashboard klicken), damit beide Entwickler denselben Stand haben.
- Sprache im Code: Bezeichner und Kommentare auf Deutsch, damit die Fachbegriffe
  (Terminart, Vermittler, Vorbereitungstermin) eindeutig bleiben.
- Supabase-Zugriff nur über `src/lib/supabase/client.ts` (Browser) bzw.
  `src/lib/supabase/server.ts` (Server) — nie direkt `createClient` aufrufen.
- **Datum und Uhrzeit ausschließlich über `src/lib/zeit.ts`.** Eingegebene Uhrzeiten
  gelten immer als Europe/Berlin, nie als Zeitzone des Browsers; gespeichert wird als
  `timestamptz`. Ein reines Kalenderdatum (ohne Uhrzeit) wird nie in Zeitzonen
  umgerechnet, sonst kippt es um einen Tag. `date-fns-tz` ist nur dort bekannt.
- **Die Regeln je Terminart stehen nur in `src/lib/termine/terminarten.ts`** — welche
  Bestätigung, Erinnerung, Anruf-Erinnerung und welcher Vorbereitungstermin fällig ist.
  Mailversand (Phase 6) und Erinnerungs-Job (Phase 7) lesen dieselbe Quelle; nie in
  Formularen oder Jobs nachbauen.
- **Google-spezifischer Code lebt ausschließlich in `src/lib/kalender/`** (seit Phase 5).
  Der Rest der Anwendung ruft nur „Termin eintragen" und „Termin absagen" auf —
  dasselbe Prinzip wie bei `src/lib/email/`. Das kostet jetzt nichts und hält die Tür
  für Outlook oder Zoom offen (siehe Zukunftsideen). Vier Entscheidungen dazu:
  - **Kein Paket `googleapis`.** Gebraucht werden fünf HTTP-Aufrufe; dafür lohnt keine
    Bibliothek, die ein Vielfaches der Anwendung wiegt. Reines `fetch` in
    `src/lib/kalender/google/`.
  - **Der Partner bekommt keinen zweiten Kalendereintrag, sondern ist Teilnehmer** am
    Termin des Besitzers. Google legt ihn damit selbst in dessen Kalender, Verschieben
    und Absagen wandern automatisch mit, und beide sehen denselben Meet-Link. Deshalb
    bleibt `appointments.partner_google_event_id` leer — und niemand muss an den
    Refresh-Token eines anderen Nutzers heran (den gibt die Datenbank auch gar nicht
    heraus; nur die Google-Adresse eines bestätigten Partners, über die Funktion
    `partner_google_adresse`).
  - **Refresh-Token liegen verschlüsselt** (AES-256-GCM, Schlüssel
    `KALENDER_TOKEN_SCHLUESSEL`). Zugriffs-Token werden nicht gespeichert, sondern je
    Aufruf frisch geholt — bei ~20 Nutzern ist das ein Aufruf mehr statt Ablauflogik.
  - **Ein Kalenderfehler bricht nie einen Termin ab.** Gespeichert wird zuerst, der
    Kalender kommt danach; ob es geklappt hat, zeigt die Terminseite und lässt sich
    dort mit einem Klick nachholen. Ein abgesagter Termin bleibt als „Abgesagt: …"
    im Kalender stehen, statt spurlos zu verschwinden.
- Kundendaten sieht grundsätzlich nur ihr Besitzer. Einzige Ausnahme: Der beteiligte
  Vertriebspartner sieht genau den Kunden, zu dem ein gemeinsamer Termin existiert
  (RLS-Policy `customers_select_partner_termin` in `0004_appointments.sql`). Diese
  Weitergabe gehört in den Datenschutzhinweis — jeder Vermittler ist ein eigenständig
  Verantwortlicher.

## Zukunftsideen (vorerst NICHT umsetzen)

- "Finanzieller Tempel": Übersicht über persönliche Finanzen/Produkte mit Kennzahlen — wird später parallel entwickelt.
- Weitere Vertriebs-Funktionen/Tools.
- **Andere Kalender** (Outlook/Microsoft Graph, CalDAV) und **andere Meeting-Anbieter**
  (Zoom o. Ä.) als Auswahl neben Google. Bewusst offengehalten, aber nicht vorgebaut.
  Realistisch bleibt das je Anbieter echte Arbeit: eigene Anmeldung, eigenes Event-Modell,
  und ein Zoom-Link entsteht ganz anders als ein Meet-Link, der beim Kalendereintrag
  nebenbei abfällt. Die Kapselung unten macht es abgegrenzt, nicht billig.
