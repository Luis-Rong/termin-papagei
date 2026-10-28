#!/usr/bin/env bash
# Richtet einen frischen Hetzner-Server (Ubuntu 24.04) für das Tool ein.
# Einmalig als root ausführen:
#   ssh root@<IP> 'bash -s' < deploy/server-einrichten.sh "<öffentlicher Deploy-Schlüssel>"
# Danach fehlt nur noch /opt/termin-papagei/.env (siehe deploy/README.md).
set -euo pipefail

DEPLOY_SCHLUESSEL="${1:?Öffentlicher Schlüssel für den Nutzer deploy fehlt}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y upgrade
apt-get -y install docker.io docker-compose-v2 unattended-upgrades
systemctl enable --now docker

timedatectl set-timezone Europe/Berlin

# Sicherheits-Updates spielt Ubuntu selbst ein.
dpkg-reconfigure -f noninteractive unattended-upgrades

# 1 GB RAM: 2 GB Swap als Reserve, damit der Server bei Spitzen nicht abstürzt.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
  sysctl -p /etc/sysctl.d/99-swap.conf
fi

# SSH nur noch mit Schlüssel. 00- gewinnt gegen 50-cloud-init.conf.
cat > /etc/ssh/sshd_config.d/00-haerten.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
systemctl reload ssh

# Eigener Nutzer für GitHub Actions — darf Docker steuern, sonst nichts.
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$DEPLOY_SCHLUESSEL" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -d -m 750 -o deploy -g deploy /opt/termin-papagei

echo "Fertig. Fehlt nur noch /opt/termin-papagei/.env"
