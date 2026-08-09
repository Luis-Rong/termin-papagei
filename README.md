# Termin Tiger 🐯

Terminierungs-Tool für Finanzdienstleister (Versicherungsvermittler nach §34d/§34f GewO):
Termine anlegen, Google-Kalender synchronisieren und automatisch personalisierte
Einladungen und Erinnerungen verschicken.

Interne Anwendung für ca. 10–20 Vermittler — kein öffentliches Angebot, kein Verkauf.

Die vollständige Projektspezifikation steht in [CLAUDE.md](CLAUDE.md).

## Lokal starten

Voraussetzungen: [Node.js](https://nodejs.org) (Version 20 oder neuer) und [Git](https://git-scm.com).

```bash
git clone https://github.com/Luis-Rong/termin-tiger.git
cd termin-tiger
npm install
npm run dev
```

Danach läuft die App unter [http://localhost:3000](http://localhost:3000).

## Umgebungsvariablen

Kopiere `.env.example` nach `.env.local` und trage die echten Werte ein
(bekommst du vom Projektpartner — **niemals committen!**).

## Google-Kalender einrichten

Optional: Ohne diesen Schritt funktioniert alles außer der Kalender-Synchronisation.
Die Einrichtung passiert **einmal für die ganze Anwendung** — danach verbindet jeder
Vermittler sein eigenes Google-Konto in den Einstellungen.

1. [Google Cloud Console](https://console.cloud.google.com) öffnen → oben ein **neues
   Projekt** anlegen (Name z. B. „Termin Tiger").
2. **APIs & Dienste → Bibliothek** → nach „Google Calendar API" suchen → **Aktivieren**.
3. **APIs & Dienste → OAuth-Zustimmungsbildschirm**:
   - Nutzertyp **Extern** (das Büro nutzt kein Google Workspace).
   - App-Name, Support-E-Mail und Kontaktadresse eintragen.
   - Berechtigungen hinzufügen: `.../auth/calendar.events` und `.../auth/userinfo.email`.
   - Anschließend **Veröffentlichungsstatus auf „In Produktion" setzen** — *nicht* auf
     „Testing" stehen lassen. Im Testmodus laufen die Zugänge nach 7 Tagen ab und
     jeder müsste wöchentlich neu verbinden.
   - Eine Prüfung durch Google ist nicht nötig: unverifiziert sind bis zu 100 Nutzer
     erlaubt, es erscheint nur einmalig ein Warnbildschirm.
4. **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID**:
   - Anwendungstyp **Webanwendung**.
   - Autorisierte Weiterleitungs-URIs (beide eintragen, Zeichen für Zeichen):
     - `http://localhost:3000/google/verbunden`
     - später zusätzlich `https://DEINE-DOMAIN/google/verbunden`
5. Client-ID und Client-Schlüssel in die `.env.local` eintragen (`GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`) und einen Verschlüsselungsschlüssel erzeugen:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

   Den ausgegebenen Wert als `KALENDER_TOKEN_SCHLUESSEL` eintragen und den
   Entwicklungsserver neu starten.
6. Migration `0005_google_connections.sql` einspielen (siehe nächster Abschnitt).
7. In der App: **Einstellungen → Mit Google Kalender verbinden**. Beim Warnhinweis von
   Google auf „Erweitert" und dann auf „Weiter zu …" klicken.

## Datenbank-Änderungen (Migrationen)

Alle Datenbank-Änderungen liegen als SQL-Dateien in `supabase/migrations/`,
aufsteigend nummeriert. So spielst du eine ein:

1. Supabase-Dashboard öffnen → **SQL Editor** → **New query**
2. Inhalt der SQL-Datei komplett hineinkopieren
3. Auf **Run** klicken

Die Dateien sind so geschrieben, dass ein zweiter Lauf nichts kaputt macht.
Wichtig: Jede Migration muss in **beiden** Supabase-Projekten laufen, falls ihr
später getrennte Projekte für Test und Echtbetrieb nutzt.

## Zusammenarbeit (wichtig!)

- **Nie direkt auf `main` committen.** Immer einen eigenen Branch anlegen und einen
  Pull Request auf GitHub erstellen:

```bash
git checkout main
git pull
git checkout -b feature/mein-thema
```

- Nach dem Arbeiten: committen, pushen, auf GitHub einen Pull Request öffnen,
  der andere schaut drüber und merged.

## Tech-Stack

Next.js (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui · Supabase (Frankfurt) ·
Google Calendar API · Resend · Claude API
