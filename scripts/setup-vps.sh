#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — VPS Setup Script (Debian/Ubuntu)
# Tested on: Ubuntu 22.04 LTS / Debian 12 (ZAP-Hosting VServer)
#
# Usage:
#   bash scripts/setup-vps.sh <domain> <email> <git-repo-url>
#
# Example:
#   bash scripts/setup-vps.sh meine-schule.de admin@meine-schule.de \
#       https://github.com/dein-user/mastermind.git
#
# After setup:
#   1. Edit /opt/mastermind/.env.production  (Secrets eintragen!)
#   2. docker compose --env-file .env.production up -d
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <email> <git-repo-url>}"
EMAIL="${2:?Usage: $0 <domain> <email> <git-repo-url>}"
REPO_URL="${3:?Usage: $0 <domain> <email> <git-repo-url>}"
APP_DIR="/opt/mastermind"

echo "══════════════════════════════════════════════════"
echo "  MasterMind VPS Setup"
echo "  Domain:  $DOMAIN"
echo "  Email:   $EMAIL"
echo "  Repo:    $REPO_URL"
echo "  AppDir:  $APP_DIR"
echo "══════════════════════════════════════════════════"

# ── 1. System update ───────────────────────────────────────────────────────
echo "▶ Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install tools ───────────────────────────────────────────────────────
echo "▶ Installing dependencies..."
apt-get install -y -qq git curl

# ── 3. Install Docker ──────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "▶ Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  usermod -aG docker "$SUDO_USER" 2>/dev/null || true
  echo "✓ Docker installed"
else
  echo "✓ Docker already installed ($(docker --version))"
fi

if ! docker compose version &>/dev/null; then
  echo "▶ Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
fi

# ── 4. Firewall ────────────────────────────────────────────────────────────
echo "▶ Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw --force enable
  ufw allow ssh
  ufw allow 80/tcp
  ufw allow 443/tcp
  echo "✓ UFW: SSH + HTTP + HTTPS"
fi

# ── 5. Clone or update repository ─────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "▶ Repository already exists — pulling latest..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "▶ Cloning repository to $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
echo "✓ Code at $(git rev-parse --short HEAD)"

# ── 6. Environment file ────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env.production" ]; then
  echo "▶ Creating .env.production from template..."
  cp "$APP_DIR/.env.production.example" "$APP_DIR/.env.production"
  sed -i "s|mastermind.deinedomain.de|$DOMAIN|g" "$APP_DIR/.env.production"
  sed -i "s|noreply@deinedomain.de|noreply@$DOMAIN|g" "$APP_DIR/.env.production"
  sed -i "s|support@deinedomain.de|support@$DOMAIN|g" "$APP_DIR/.env.production"
  echo ""
  echo "  ╔══════════════════════════════════════════════════╗"
  echo "  ║  WICHTIG: .env.production bearbeiten!            ║"
  echo "  ║  nano $APP_DIR/.env.production                   ║"
  echo "  ║                                                   ║"
  echo "  ║  Mindestens ausfüllen:                           ║"
  echo "  ║  - POSTGRES_PASSWORD  (starkes Passwort)         ║"
  echo "  ║  - SESSION_SECRET     (openssl rand -base64 32)  ║"
  echo "  ║  - ANTHROPIC_API_KEY  (von console.anthropic.com)║"
  echo "  ╚══════════════════════════════════════════════════╝"
  echo ""
  read -p "  Drücke ENTER wenn du fertig bist..." || true
else
  echo "✓ .env.production existiert bereits"
fi

# ── 7. Replace domain in nginx config ─────────────────────────────────────
echo "▶ Configuring nginx domain..."
sed -i "s|mastermind.example.com|$DOMAIN|g" "$APP_DIR/nginx/conf.d/mastermind.conf"
echo "✓ Nginx configured for $DOMAIN"

# ── 8. Issue SSL certificate (HTTP must be reachable by Let's Encrypt) ─────
echo "▶ Issuing Let's Encrypt SSL certificate for $DOMAIN..."
echo "  (DNS muss bereits auf diese IP zeigen!)"

cat > /tmp/nginx-init.conf << 'NGINXEOF'
events { worker_connections 64; }
http {
  server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "ok\n"; add_header Content-Type text/plain; }
  }
}
NGINXEOF

docker run -d --name nginx_temp \
  -p 80:80 \
  -v /tmp/nginx-init.conf:/etc/nginx/nginx.conf:ro \
  -v mastermind_certbot_webroot:/var/www/certbot \
  nginx:1.25-alpine 2>/dev/null || true

sleep 3

docker run --rm \
  -v mastermind_certbot_certs:/etc/letsencrypt \
  -v mastermind_certbot_webroot:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  || echo "⚠️  SSL-Zertifikat fehlgeschlagen — DNS prüfen und manuell nachholen"

docker stop nginx_temp && docker rm nginx_temp 2>/dev/null || true
echo "✓ SSL-Zertifikat ausgestellt (oder bereits vorhanden)"

# ── 9. Deploy-Script ausführbar machen ────────────────────────────────────
chmod +x "$APP_DIR/scripts/deploy.sh"

# ── 10. Initial build & start ─────────────────────────────────────────────
echo "▶ Building and starting containers..."
cd "$APP_DIR"
docker compose --env-file .env.production build --no-cache
docker compose --env-file .env.production up -d

# ── 11. Optionaler cron-Job für tägliche Backups ──────────────────────────
BACKUP_CRON="0 3 * * * bash $APP_DIR/scripts/backup-db.sh >> /var/log/mastermind-backup.log 2>&1"
if ! crontab -l 2>/dev/null | grep -q "backup-db.sh"; then
  (crontab -l 2>/dev/null; echo "$BACKUP_CRON") | crontab -
  echo "✓ Backup-Cron eingerichtet (täglich 03:00 Uhr)"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✓ MasterMind läuft unter https://$DOMAIN"
echo ""
echo "  Nützliche Befehle:"
echo "  docker compose logs -f app              # App-Logs"
echo "  docker compose logs -f nginx            # Nginx-Logs"
echo "  bash $APP_DIR/scripts/deploy.sh         # Manuelles Deploy"
echo "  bash $APP_DIR/scripts/backup-db.sh      # DB-Backup"
echo ""
echo "  GitHub Actions CD-Setup:"
echo "  Repo → Settings → Secrets:"
echo "    VPS_HOST = $(curl -sf https://api.ipify.org || hostname -I | awk '{print $1}')"
echo "    VPS_USER = root"
echo "    VPS_SSH_KEY = (privater SSH-Schlüssel des Servers)"
echo "══════════════════════════════════════════════════"
