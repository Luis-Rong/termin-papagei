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
| E-Mail | Resend (Free-Tier: 100 Mails/Tag reicht) |
| LLM | Claude API, Modell `claude-haiku-4-5`, niedrige Temperatur, strikte Vorlagen-Treue |
| Erinnerungen | Supabase pg_cron + Edge Function, täglicher Lauf (Europe/Berlin) |
| Hosting | Entwicklung lokal; Deployment Vercel (Go-Live: Pro-Plan, Hobby ist nicht-kommerziell) |

Zeitzone immer **Europe/Berlin**. DSGVO beachten: EU-Region, strikte RLS, an die
Claude-API nur das Nötigste senden (Name, Terminart, Datum — nie Finanzdaten).

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

Phasenplan siehe Projektplan; grob: 0 Fundament ✅ → 1 Accounts/Login → 2 Kunden →
3 Partner-Netzwerk → 4 Termin-Wizard → 5 Google Kalender/Meet → 6 Vorlagen/E-Mail/LLM →
7 automatische Erinnerungen → 8 Feinschliff/Go-Live (braucht Namensentscheidung + Domain).

## Zukunftsideen (vorerst NICHT umsetzen)

- "Finanzieller Tempel": Übersicht über persönliche Finanzen/Produkte mit Kennzahlen — wird später parallel entwickelt.
- Weitere Vertriebs-Funktionen/Tools.
