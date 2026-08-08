# Termin Tiger 🐯

Terminierungs-Tool für Finanzdienstleister (Versicherungsvermittler nach §34d/§34f GewO):
Termine anlegen, Google-Kalender synchronisieren und automatisch personalisierte
Einladungen und Erinnerungen verschicken.

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
