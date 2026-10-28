# Prompt für Luis (in sein Claude einfügen)

Kopiere alles ab der nächsten Überschrift in deinen Claude-Chat im Ordner `termin-papagei`.

---

## Aufgabe: Front-End-Branch von Mart mit meinem Backend zusammenführen und alles prüfen

Ich bin Luis, wir sind ein Zwei-Personen-Team am Termin-Papagei (`Luis-Rong/termin-papagei`).
Mart hat am 28.10.2026 **ausschließlich das Front-End** überarbeitet und auf den Branch
`feature/corporate-design` gepusht. Ich habe in der Zwischenzeit das **Backend** auf `main`
weiterentwickelt (zuletzt PR #21, Hetzner-Deployment: Dockerfile, Caddy, GitHub-Actions-Workflow,
`next.config.ts`). Beides muss jetzt zusammen.

Die Regeln aus `CLAUDE.md` gelten: nie direkt auf `main` committen, Feature-Branch plus Pull
Request, `.env.local` nie committen.

### Schritt 1 — Lesen, bevor du etwas anfasst

1. `git fetch origin` und `git checkout feature/corporate-design`.
2. Lies vollständig `docs/UEBERGABE-FRONTEND-2026-10-28.md`. Dort steht exakt, was Mart geändert
   hat: zwei Datenbank-Migrationen, neue Fachregeln, geänderte Signaturen, neue Formularfelder,
   neue Komponenten. Abschnitt 4 und 7 nennen die Konfliktpunkte.
3. Lies die `CLAUDE.md` auf dem Branch (Abschnitte „Terminarten & Regeln", „Datenmodell",
   „Design-Vorgaben", „Offen nach der Front-End-Runde").
4. Sieh dir an, was ich seit dem Abzweigpunkt auf `main` geändert habe:
   `git diff --stat 3115dc3 origin/main`. Erwartete Überschneidung: nur `CLAUDE.md`
   (beide Seiten haben sie erweitert — beide Ergänzungen behalten).

### Schritt 2 — Zusammenführen

1. Neuen Branch von Marts Branch: `git checkout -b feature/frontend-merge feature/corporate-design`.
2. `git merge origin/main`. Konflikte lösen — bei `CLAUDE.md` beide Teile zusammenführen, nichts
   wegwerfen. Bei Code-Konflikten gilt: Marts Oberfläche und seine Fachregeln (Terminarten, Orte,
   Erinnerungen, Vorlagen, Du/Sie, Themen) bleiben; meine Backend-Änderungen (Deployment, Infrastruktur,
   alles außerhalb von `src/components`, `src/app/(app)/*/page.tsx` und `globals.css`) bleiben.
   Wo beides dieselbe Datei betrifft, zuerst die Übergabe-Notiz lesen, dann entscheiden, dann mir
   die Stelle nennen.
3. Prüfe, ob mein Backend neue Felder, Tabellen oder Funktionen eingeführt hat, die Marts Front-End
   noch nicht kennt — und umgekehrt (Abschnitt 1, 4 und 7 der Übergabe-Notiz). Fehlendes ergänzen.
4. Prüfe das Deployment (Dockerfile, `deploy/`, Workflow) gegen den neuen Stand: neue Dateien
   unter `public/` (Logos, `icon.svg`), `next/font/google` (Spectral wird beim Build geladen —
   braucht Netz im Build-Schritt), keine neuen Umgebungsvariablen.

### Schritt 3 — Datenbank

Zwei Migrationen müssen in Supabase laufen, in dieser Reihenfolge, jede einmal:
`supabase/migrations/0016_terminarten_erweitert.sql`, dann `0017_erinnerungen_mehr.sql`
(SQL Editor → New query → Inhalt einfügen → Run). Beide sind additiv (neue Spalten mit Defaults,
alter Code läuft weiter). 0016 ersetzt die 15 alten Standardvorlagen durch 36 neue (Du und Sie);
eigene Vorlagen bleiben. Wenn du lokal eine eigene Datenbank nutzt, dort ebenfalls.
Falls meine Backend-Arbeit eigene Migrationen mitbringt: Nummern so sortieren, dass die Reihenfolge
eindeutig bleibt, und in der `CLAUDE.md` nachziehen.

### Schritt 4 — Prüfvorgang (alles muss grün sein, Ergebnis mir als Liste melden)

Technik:
1. `npm ci`, dann `npx tsc --noEmit -p .` — null Fehler.
2. `npx eslint src` — null Fehler.
3. `npm run build` — Exit 0.
4. `npm run cf:build` bzw. der Docker-Build, je nachdem was wir deployen — läuft durch.

Fachlich, im Browser mit einem Testkunden (nie mit echten Kundendaten, keine Mails an echte Adressen):
5. **Anmelden** und Übersicht laden: Kennzahlen, nächste Termine, keine Fehlermeldung.
6. **Termine**: alle Zähler sichtbar (Alle, Beratungsprozess mit drei Unterzählern, Service mit zwei),
   jeder Zähler filtert, Liste nach Tagen gruppiert, vergangene Termine aufklappbar.
7. **Neuer Termin, bestehender Kunde**: Kundensuche tippen, Enter nimmt den obersten Treffer;
   Terminart mit Strich zwischen Umsetzung und After-Sales; Ort Telefon stellt die Erinnerungen auf
   „Am Termintag, 09:00 Uhr" und „1 Stunde vorher"; Ort „Anderer Ort" zeigt Straße und PLZ/Ort;
   Datum per Klick auf „Monat Jahr" in die Monatsansicht; Uhrzeit öffnet die Räder, „930" tippen
   ergibt 09:30; Dauer-Stufen 10 Min bis 2 Std; „Erinnerung hinzufügen" bis fünf, Entfernen ab der
   dritten; Einheiten Stunden/Tage/Wochen mit Einzahl bei 1; Kippschalter „Feste Uhrzeit"; drei
   Themen anwählen, Reihenfolge mit Pfeilen ändern, eigenes Thema per Plus speichern;
   „Bestätigung sofort senden" ist vorangekreuzt. Termin anlegen → Terminseite öffnet sich.
8. **Terminseite**: Betreff zeigt die Themen hinten („… – Thema 1, Thema 2"), `{{tag}}` als
   Wochentag; Erinnerungen-Karte listet alle angelegten Erinnerungen mit Zeitpunkt; Kalender-Karte;
   Termindaten bearbeiten, speichern, Mail-Entwurf wird neu erstellt.
9. **Neuer Termin, neuer Kunde inline**: Umschalter „Neuer Kunde", nur Vorname + per Du → Termin
   und Kunde werden angelegt; nur Nachname + per Sie (Herr/Frau) → ebenfalls; per Du ohne Vornamen →
   Fehlermeldung.
10. **Kunden**: Telefon optional; Pille „per Du | per Sie"; bei Sie erscheint Herr/Frau.
11. **Vorlagen**: sieben Bereiche eingeklappt, je Bereich Du- und Sie-Satz, Tags Bestätigung (Marine)
    und Erinnerung (Orange), „Kopieren" legt eine Kopie daneben, „Bearbeiten" nur bei eigenen;
    Platzhalter-Menü im Betreff und im Editor fügt `{{…}}` ein; Editor F/K/U und Farbpalette;
    Bereich „Sonstige Vorlagen" mit eigener Vorlage.
12. **Mailversand** (mit `RESEND_API_KEY` auf eine eigene Testadresse): Bestätigung senden — Betreff
    und Text stimmen, Du- bzw. Sie-Vorlage je nach Kunde, bei Telefontermin die Telefon-Vorlage,
    Knöpfe und Signatur darunter.
13. **Erinnerungs-Job**: `POST /api/erinnerungen` einmal von Hand auslösen (mit `ERINNERUNG_GEHEIMNIS`)
    mit einem Termin, dessen Erinnerung fällig ist — Mail kommt, `email_log` hat den Eintrag mit
    dem richtigen `purpose` (`erinnerung_1tag`, `erinnerung_2std`, `erinnerung_3` …).
14. **Google-Kalender**: Termin anlegen → Eintrag hat zwei Erinnerungen (1 Tag, 2 Std), Ort steht
    drin (Büro, Telefon oder Adresse), Meet-Link nur bei Digital.
15. **Zusage-Seite** `/zusage/<token>`: zeigt Ort bzw. Adresse, duzt den Kunden, Zusage funktioniert.
16. **Einstellungen**: über „Signatur ändern" aus einer Vorlage hin → oben steht „← Vorlagen".
17. Handy-Breite (375 px) einmal durch Termine, Terminformular und Vorlagen scrollen: nichts läuft
    über den Rand.

### Schritt 5 — Abschluss

- Alles committen, Pull Request `feature/frontend-merge` → `main` mit kurzer Beschreibung: was gemergt
  wurde, welche Konflikte wie gelöst, Ergebnis des Prüfvorgangs als Liste (Punkt 1–17 mit ✅/❌).
- Was nicht läuft, nicht stillschweigend ändern, sondern im PR benennen. Mart schaut drüber.
- Danach `docs/UEBERGABE-FRONTEND-2026-10-28.md` um einen Abschnitt „Stand nach dem Merge" ergänzen.
