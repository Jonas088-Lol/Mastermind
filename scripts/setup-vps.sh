#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — VPS Setup Script (Debian/Ubuntu)
# Tested on: Ubuntu 22.04 LTS / Debian 12
#
# Usage: bash scripts/setup-vps.sh yourdomain.de your@email.com
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"
APP_DIR="/opt/mastermind"

echo "══════════════════════════════════════════════════"
echo "  MasterMind VPS Setup"
echo "  Domain: $DOMAIN | Email: $EMAIL"
echo "══════════════════════════════════════════════════"

# ── 1. System update ───────────────────────────────────────────────────────
echo "▶ Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Docker ──────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "▶ Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  usermod -aG docker "$SUDO_USER" || true
  echo "✓ Docker installed"
else
  echo "✓ Docker already installed ($(docker --version))"
fi

# Docker Compose plugin check
if ! docker compose version &>/dev/null; then
  echo "▶ Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
fi

# ── 3. Firewall ────────────────────────────────────────────────────────────
echo "▶ Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw --force enable
  ufw allow ssh
  ufw allow 80/tcp
  ufw allow 443/tcp
  echo "✓ UFW configured (SSH + HTTP + HTTPS)"
fi

# ── 4. App directory ───────────────────────────────────────────────────────
echo "▶ Creating app directory at $APP_DIR..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/nginx/conf.d"

# ── 5. Environment file ────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env.production" ]; then
  echo "▶ Creating .env.production from template..."
  cp .env.production.example "$APP_DIR/.env.production"
  # Replace domain placeholder
  sed -i "s|mastermind.deinedomain.de|$DOMAIN|g" "$APP_DIR/.env.production"
  echo "✓ .env.production created at $APP_DIR/.env.production"
  echo "⚠️  IMPORTANT: Edit $APP_DIR/.env.production and fill in your secrets!"
else
  echo "✓ .env.production already exists"
fi

# ── 6. Copy app files ──────────────────────────────────────────────────────
echo "▶ Copying app files to $APP_DIR..."
rsync -a --exclude='.git' --exclude='node_modules' --exclude='.next' \
  --exclude='prisma/prisma/dev.db' . "$APP_DIR/"

# Update nginx domain config
sed -i "s|mastermind.example.com|$DOMAIN|g" "$APP_DIR/nginx/conf.d/mastermind.conf"

# ── 7. Issue SSL certificate ───────────────────────────────────────────────
echo "▶ Issuing Let's Encrypt certificate..."

# Start nginx in HTTP-only mode first (needed for ACME challenge)
cat > /tmp/nginx-init.conf << 'EOF'
events { worker_connections 64; }
http {
  server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "ok"; }
  }
}
EOF

# Temporary nginx for cert issuance
docker run -d --name nginx_temp \
  -p 80:80 \
  -v /tmp/nginx-init.conf:/etc/nginx/nginx.conf:ro \
  -v mastermind_certbot_webroot:/var/www/certbot \
  nginx:1.25-alpine || true

sleep 2

# Issue certificate
docker run --rm \
  -v mastermind_certbot_certs:/etc/letsencrypt \
  -v mastermind_certbot_webroot:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" || echo "⚠️ SSL cert issuance failed — check domain DNS and try manually"

docker stop nginx_temp && docker rm nginx_temp || true

echo "✓ SSL certificate issued (or already exists)"

# ── 8. Build and start ─────────────────────────────────────────────────────
echo "▶ Building and starting containers..."
cd "$APP_DIR"
docker compose --env-file .env.production build --no-cache
docker compose --env-file .env.production up -d

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✓ MasterMind is starting at https://$DOMAIN"
echo ""
echo "  Useful commands:"
echo "  docker compose logs -f app         # App logs"
echo "  docker compose logs -f nginx       # Nginx logs"
echo "  docker compose --env-file .env.production ps  # Status"
echo "  docker compose down                # Stop all"
echo ""
echo "  ⚠️  Remember to edit $APP_DIR/.env.production"
echo "══════════════════════════════════════════════════"
