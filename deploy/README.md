# Betrieb auf dem Hetzner-Server

Das Tool läuft unter **https://papagei.masangkay.de** auf einem Hetzner-Cloud-Server
(1 GB RAM, Ubuntu 24.04) als Docker-Container, davor Caddy für HTTPS.

## Wie ein Update auf den Server kommt

Merge auf `main` → GitHub Actions (`.github/workflows/deploy.yml`) baut das Image,
legt es in die GitHub Container Registry und startet es auf dem Server neu.
Nichts davon passiert von Hand. Gebaut wird bei GitHub, weil `next build` mehr
Speicher braucht, als der Server hat.

Von Hand anstoßen: GitHub → Actions → „Deployment (Hetzner)" → **Run workflow**.

## Was wo liegt

| Ort | Inhalt |
|---|---|
| Server `/opt/termin-papagei/.env` | alle Geheimnisse — Vorlage ist `.env.example`; **nur dort, nie im Repo** |
| Server `/opt/termin-papagei/docker-compose.yml`, `Caddyfile` | kopiert der Workflow bei jedem Lauf aus `deploy/` |
| GitHub Secret `SERVER_SSH_KEY` | privater Schlüssel des Server-Nutzers `deploy` |
| GitHub Variablen `SERVER_HOST`, `SERVER_KNOWN_HOSTS` | IP und Fingerabdruck des Servers |

Ändert sich ein Wert in `.env`, reicht auf dem Server:

```bash
cd /opt/termin-papagei && docker compose up -d
```

## Nachschauen, wenn etwas nicht läuft

```bash
ssh root@167.233.106.91
cd /opt/termin-papagei
docker compose ps            # laufen beide Container?
docker compose logs -f app   # Fehler der Anwendung
docker compose logs caddy    # Zertifikat / HTTPS
```

## Server neu aufsetzen

1. In der Hetzner Console: Rebuild mit Ubuntu 24.04 und eigenem SSH-Schlüssel.
2. `ssh root@<IP> 'bash -s' < deploy/server-einrichten.sh "<öffentlicher Deploy-Schlüssel>"`
3. `.env` nach `/opt/termin-papagei/` legen (Rechte: `chown deploy:deploy`, `chmod 600`).
4. `SERVER_KNOWN_HOSTS` in GitHub erneuern (`ssh-keyscan <IP>`), Workflow von Hand starten.
