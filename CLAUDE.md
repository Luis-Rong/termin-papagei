@AGENTS.md

# Termin Papagei — Projektspezifikation

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
5. **E-Mails**: Terminbestätigung sofort; zusätzlich zwei Erinnerungen an den Kunden (siehe unten). Vorlagen wählbar, bearbeitbar, neue anlegbar. Die Mail entsteht **ohne KI** direkt aus der Vorlage; sie geht entweder sofort raus (Häkchen im Wizard) oder nach Vorschau per Klick. Nur auf Knopfdruck arbeitet ein LLM einen persönlichen Hinweis des Vermittlers ein (siehe unten).
6. **Vorbereitungstermine** (nur eigener Kalender, unabhängig vom Kunden — siehe Tabelle).

## Terminarten & Regeln

| Terminart | Bestätigung an Kunden | Erinnerungen an Kunden | Zusatzregel |
|---|---|---|---|
| Erstgespräch | ja | ja, Standard an | — |
| Beratung | ja | ja, Standard an | Individueller **Vorbereitungstermin** wird zusätzlich vereinbart (eigener Kalender, je nach Situation auch Kalender des Partners) |
| Umsetzung | ja | ja, Standard an | Immer 1 Tag vorher **Erinnerung an den Vermittler**, den Kunden anzurufen |
| After-Sales | ja | ja, Standard an | — |
| Service | ja | ja, Standard an | — |

**Erinnerungen (entschieden Sep 2026):** Pro Termin gibt es zwei unabhängige Kunden-Erinnerungen —
„1 Tag vorher" und „2 Std vorher" — einheitlich für alle Terminarten, beide **Standard an**, aber
**jede einzeln abschaltbar**. Bei beiden ist der Vorlauf (Stunden vor dem Termin) **pro Termin im
Termin-Wizard editierbar**, nicht hart codiert — Default 24 bzw. 2 Stunden. Das ist unabhängig von
der festen Anruf-Erinnerung an den Vermittler bei Umsetzung-Terminen.

Weitere Funktion: Liste aller Termine — editieren, löschen, Notizen hinzufügen, Status.

## Tech-Stack (entschieden)

| Baustein | Wahl |
|---|---|
| Framework | Next.js (App Router, TypeScript, `src/`-Verzeichnis), Tailwind CSS v4, shadcn/ui |
| Datenbank + Auth | Supabase, Region **Frankfurt (EU)** — E-Mail/Passwort-Auth, Postgres mit Row Level Security |
| Kalender | Google Calendar API, OAuth pro Nutzer; Meet-Link via `conferenceData` |
| E-Mail | Resend, hinter einer eigenen Abstraktion `src/lib/email/` — Anbieterwechsel muss eine Ein-Datei-Änderung bleiben |
| LLM | Google Gemini API, gekapselt in `src/lib/llm/` — nur optional auf Knopfdruck („Hinweis mit KI einarbeiten"), niedrige Temperatur, strikte Vorlagen-Treue (Gratis-Stufe nur bis zum Go-Live, siehe unten) |
| Erinnerungen | Supabase pg_cron (alle 15 Min) ruft per pg_net `POST /api/erinnerungen` der Anwendung auf — keine Edge Function, siehe unten |
| Hosting | Entwicklung lokal; Deployment Vercel Pro **oder** Cloudflare Workers (vorbereitet, noch nicht entschieden — siehe unten) |

Zeitzone immer **Europe/Berlin**. DSGVO beachten: EU-Region, strikte RLS, an die
Claude-API nur das Nötigste senden (Name, Terminart, Datum — nie Finanzdaten).

### Verbindliche Betriebs-Entscheidungen

- **Erinnerungs-Job läuft alle 15–30 Min, nicht täglich (entschieden Sep 2026).** Grund: die
  „2 Std vorher"-Erinnerung braucht ein präzises Zeitfenster (ein Termin um 10 Uhr muss um 8 Uhr
  raus, einer um 14 Uhr erst um 12 Uhr) — ein einzelner Tages-Lauf trifft das nicht. Jeder Lauf
  prüft, welche Termine gerade in ihr individuelles `erinnerung_1tag_stunden_vorher`- bzw.
  `erinnerung_2std_stunden_vorher`-Fenster fallen, und muss über `email_log` unterscheiden können,
  welche der beiden Erinnerungen für einen Termin schon raus ist (sonst Doppelversand oder
  Blockade der zweiten Mail durch den Duplikat-Schutz der ersten).
- **Google OAuth: Publishing-Status „In Produktion", NICHT „Testing".**
  Im Testing-Modus laufen Refresh-Tokens nach **7 Tagen** ab — jeder Nutzer müsste
  wöchentlich neu verbinden und der Erinnerungs-Job würde reihenweise brechen.
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
- **Cloudflare Workers als Gratis-Alternative zu Vercel (getestet Okt 2026, noch nicht
  entschieden).** Cloudflare erlaubt kommerzielle Nutzung im Gratis-Tarif. Die App baut
  mit `npm run cf:build` (OpenNext-Adapter) und läuft lokal in der Worker-Laufzeit
  (`npm run cf:preview`): Seiten, Proxy, Server Actions, Kalender, Erinnerungs-Job.
  Zwei Grenzen des Gratis-Tarifs: **3 MB Codegröße** (aktuell ~2,9 MB minifiziert —
  neue große Pakete sprengen das) und **10 ms Rechenzeit je Anfrage** (lokal nicht
  messbar, erst ein echtes Deployment zeigt es). Reicht eins nicht: Workers Paid
  (5 $/Monat). Deshalb läuft die HTML-Säuberung über `sanitize-html` statt DOMPurify —
  DOMPurify braucht serverseitig jsdom, das auf Workers nicht läuft.
- **Mail-Volumen im Blick behalten:** Resend Free = 100 Mails/Tag. Bei ~20 aktiven Vermittlern
  mit je 3 Terminen/Tag (Bestätigung + Erinnerung) wird das knapp. Fallback ohne Codeumbau:
  Brevo (300 Mails/Tag frei, EU-Anbieter) oder Resend Pro.
- **Backups:** Der Supabase-Free-Tier hat **keine automatischen Backups**. Da echte
  Kundendaten verarbeitet werden, ist entweder Supabase Pro (tägliche Backups) oder ein
  eigener, geplanter Datenbank-Export Pflicht, bevor echte Kunden erfasst werden.
- **Registrierung absichern:** kein offenes Sign-up — Einladungscode oder manuelle Freischaltung.
- **LLM: vorerst die Gratis-Stufe von Gemini (entschieden Aug 2026).** Zum Bauen und
  Testen mit erfundenen Kunden völlig ausreichend. Aber: Auf den Gratis-Stufen behält
  Google sich vor, eingeschickte Inhalte zur Verbesserung der eigenen Modelle zu
  verwenden, inklusive Einsicht durch Menschen — und einen Auftragsverarbeitungsvertrag
  gibt es dort nicht. **Vor den ersten echten Kundendaten ist deshalb der Wechsel auf
  eine bezahlte Stufe Pflicht**, sonst fehlt die DSGVO-Grundlage. Damit das eine
  Ein-Datei-Änderung bleibt, liegt der Aufruf hinter `src/lib/llm/` — dasselbe Prinzip
  wie bei `src/lib/email/` und `src/lib/kalender/`.
- **Eine gemeinsame Absender-Domain für alle Vermittler**, kein eigener Absender je
  Person. Jede weitere Domain müsste einzeln per DNS-Einträgen bestätigt werden — bei
  ~20 Vermittlern wäre das ein Klotz am Bein, und die wenigsten besitzen überhaupt eine.
  Persönlich wird die Mail über den **Anzeigenamen** (Vor- und Nachname, Firma) und
  **`Reply-To` auf die eigene Adresse** des Vermittlers: Der Kunde liest den Namen
  seines Beraters, und seine Antwort landet direkt in dessen Postfach. Die eigene
  Adresse des Vermittlers als technischen Absender zu setzen ist keine Option — das
  scheitert an SPF/DKIM und landet im Spam.
- **Signatur und Vorlagen gehören jedem Vermittler selbst.** Die Signatur steht im
  Profil und hängt unter jeder Mail; Vorlagen liegen je Besitzer in `templates`
  (`owner_id = null` sind gemeinsame Systemvorlagen als Startpunkt).

## Datenmodell (Supabase/Postgres)

| Tabelle | Inhalt |
|---|---|
| `profiles` | 1:1 zu `auth.users` — Vorname, Nachname, Firma, Signatur (ab Phase 6); Basis für Partnersuche |
| `partnerships` | requester_id, addressee_id, status (`pending`/`accepted`); ein Eintrag pro Paar |
| `customers` | owner_id, Vorname, Nachname, Telefon, E-Mail, source_partner_id (nullable) |
| `appointments` | owner_id, customer_id, partner_id (nullable), Terminart, Ort (`buero`/`digital`), starts_at/ends_at, Notizen, google_event_id, partner_google_event_id, meet_link, status, kind (`kundentermin`/`vorbereitung`), parent_appointment_id, erinnerung_1tag_aktiv (bool, Default true), erinnerung_1tag_stunden_vorher (int, Default 24), erinnerung_2std_aktiv (bool, Default true), erinnerung_2std_stunden_vorher (int, Default 2), bestaetigung_entwurf_html, bestaetigung_entwurf_am (letzte Änderung am Entwurf; später als der letzte Versand = Kunde kennt diese Fassung noch nicht) |
| `templates` | owner_id (`null` = Systemvorlage), Terminart, Zweck (`bestaetigung`/`erinnerung_1tag`/`erinnerung_2std`), Betreff, Text |
| `google_connections` | user_id, verschlüsselter Refresh-Token, verbundene Google-Adresse |
| `email_log` | appointment_id, Empfänger, Zweck (`bestaetigung`/`erinnerung_1tag`/`erinnerung_2std`), sent_at — verhindert Doppelversand |

## Design-Vorgaben

Professionell, passend zum Finanzvertrieb.

- Schriften: Überschriften **Palatino** (`Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif`), Fließtext **Trebuchet MS** (`"Trebuchet MS", "Segoe UI", Tahoma, sans-serif`) — Systemschriften, kein Webfont-Loading.
- Hauptfarben: Dunkelblau `#101E47` (Primär), Beige `#E6DEBC` (Sekundär/Flächen).
- Nebenfarben: Rostrot `#912B1C`, Altrosa `#BE5D80`, Anthrazit `#27272F`.

## Arbeitsregeln (2-Personen-Team, wenig Git-Erfahrung)

- **Nie direkt auf `main` committen.** Für jede Aufgabe einen eigenen Branch (`feature/…`), dann Pull Request auf GitHub (`Luis-Rong/termin-papagei`), der andere schaut kurz drüber, dann mergen.
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
  Einzige Ausnahme: `src/lib/supabase/admin.ts` (geheimer Schlüssel, umgeht RLS) —
  ausschließlich für den Erinnerungs-Job, nie für etwas, das ein Nutzer auslöst.
- **Erinnerungs-Job (Phase 7, entschieden Sep 2026):** pg_cron stößt alle 15 Min
  `POST /api/erinnerungen` an (`0013_erinnerungen_cron.sql`, Adresse und Geheimnis im
  Supabase Vault). Die Logik liegt in `src/lib/erinnerungen/` und nutzt dieselben
  Vorlagen, Platzhalter, Signatur und denselben Mailversand wie die Bestätigung — eine
  Deno-Edge-Function hätte das alles nachbauen müssen. Wann was fällig ist, steht nur in
  `erinnerungsPlan` (`plan.ts`); Job und Terminseite lesen beide daraus. Regeln:
  - Nichts rückwirkend: War eine Erinnerung schon fällig, als der Termin angelegt
    wurde, entfällt sie.
  - Ist „2 Std vorher" schon dran, entfällt eine noch offene „1 Tag vorher".
  - `email_log.termin_beginn` merkt sich, für welchen Beginn eine Erinnerung galt —
    nach einer Verschiebung gehen die Erinnerungen neu raus.
  - Doppelversand verhindert ein eindeutiger Index; der Job trägt die Zeile *vor* dem
    Versand ein und markiert sie bei Fehlschlag mit `error` (dann nächster Versuch).
  - Anruf-Erinnerung (Umsetzung): 24 Std vorher an die eigene Adresse des Vermittlers.
  - Lokal erreicht pg_cron die Anwendung nicht — zum Testen die Route von Hand aufrufen:
    `curl -X POST http://localhost:3000/api/erinnerungen -H "Authorization: Bearer $ERINNERUNG_GEHEIMNIS"`.
    Mit `?jetzt=2026-09-29T06:05:00%2B02:00` spielt er lokal einen anderen Zeitpunkt
    durch (in Produktion ignoriert).
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
    und Absagen wandern automatisch mit, und beide sehen denselben Meet-Link. Google
    verschickt dafür eine Einladung an den Partner (`sendUpdates=all`); ohne sie gilt
    er dauerhaft als „hat nicht geantwortet" und der Termin bleibt je nach
    Kontoeinstellung bei ihm unsichtbar. **Kunden sind nie Teilnehmer** und bekommen
    von diesen Mails nichts mit. Deshalb
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
- **Platzhalter in `templates.body`** (seit `0008_vorlagen.sql`): `{{vorname}}`,
  `{{datum}}`, `{{uhrzeit}}`, `{{ort}}` — werden beim Erstellen des Mail-Entwurfs
  deterministisch durch die echten Termindaten ersetzt. `{{ort}}` wird zur Satzform
  aus `ORT_IM_SATZ` („im Büro" / „digital per Videocall"), nicht zur Beschriftung
  aus `ORTE`. Die Signatur
  (`profiles.signature`) hängt automatisch unter jede Mail und gehört deshalb nicht
  in den Vorlagentext; Vorlagen-Editor und Mail-Vorschau zeigen sie gesperrt darunter
  an, mit Link zu `/einstellungen#signatur`.
- **Kein LLM im Standardweg (entschieden Sep 2026).** Die Platzhalter füllt der Code
  zuverlässig; ein LLM, das eine fertige Vorlage nur umformuliert, brachte Wartezeit,
  Unvorhersehbarkeit und Datenweitergabe ohne Mehrwert. Es kommt nur auf Knopfdruck
  zum Einsatz, um einen Hinweis des Vermittlers einzuarbeiten (`hinweisEinarbeiten`),
  und das Ergebnis steht vor dem Versand in der Vorschau. Die automatischen
  Erinnerungen (Phase 7) laufen grundsätzlich ohne LLM.
- **Mail-Entwurf folgt dem Termin.** Ändern sich Datum, Ort, Terminart, Kunde oder
  Meet-Link, entsteht der Entwurf neu aus der Vorlage (`entwurfNachAenderung` in
  `termine/actions.ts`) — sonst ginge das alte Datum raus. War die Bestätigung schon
  verschickt, zeigen Terminseite und Terminliste an, dass sie erneut raus muss.
- **Bilder in Mails:** Beim Hochladen verkleinert der Browser auf max. 1000 px Breite
  und PNG/JPEG (`src/lib/bild-verkleinern.ts`; WebP kann Outlook nicht, Server
  Actions nehmen max. 1 MB). Die Größe steht als `width`-Attribut am Bild — das
  einzige, was auch Outlook für Windows beachtet; `height` fällt beim Versand weg
  (`versandHtml`), damit schmale Displays nicht verzerren.
- **15 Systemvorlagen** (5 Terminarten × Bestätigung/Erinnerung-1-Tag/Erinnerung-2-Std)
  sind mit `0008_vorlagen.sql` vorbelegt: kurz und vertrieblich verbindlich, für einen
  Finanz-/Versicherungsmakler mit Terminen zur ganzheitlichen Finanzplanung.
  Systemvorlagen selbst sind nicht änderbar — auf `/vorlagen` kopiert man sie sich
  erst („Kopieren & bearbeiten"), danach ist es eine ganz normale eigene Vorlage.
  Eigene Vorlagen lassen sich unter `/vorlagen` anlegen, bearbeiten und löschen.

## Zukunftsideen (vorerst NICHT umsetzen)

- "Finanzieller Tempel": Übersicht über persönliche Finanzen/Produkte mit Kennzahlen — wird später parallel entwickelt.
- Weitere Vertriebs-Funktionen/Tools.
- **Andere Kalender** (Outlook/Microsoft Graph, CalDAV) und **andere Meeting-Anbieter**
  (Zoom o. Ä.) als Auswahl neben Google. Bewusst offengehalten, aber nicht vorgebaut.
  Realistisch bleibt das je Anbieter echte Arbeit: eigene Anmeldung, eigenes Event-Modell,
  und ein Zoom-Link entsteht ganz anders als ein Meet-Link, der beim Kalendereintrag
  nebenbei abfällt. Die Kapselung unten macht es abgegrenzt, nicht billig.
