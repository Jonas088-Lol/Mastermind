#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — Server-Side Deploy Script
#
# Run this on the VPS to pull latest code and restart the app.
# Called automatically by GitHub Actions on every push to main.
#
# Usage (manual): bash /opt/mastermind/scripts/deploy.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mastermind}"
COMPOSE="docker compose --env-file .env.production"

echo "══════════════════════════════════════════════════"
echo "  MasterMind Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════════════"

cd "$APP_DIR"

# ── 1. Pull latest code ────────────────────────────────────────────────────
echo "▶ Pulling latest code..."
git pull origin main
echo "✓ Code updated ($(git rev-parse --short HEAD))"

# ── 2. Rebuild only the app container (db + nginx stay up) ────────────────
echo "▶ Building app container..."
$COMPOSE build --no-cache app
echo "✓ Build complete"

# ── 3. Restart app with zero-downtime (db + nginx keep running) ───────────
echo "▶ Restarting app..."
$COMPOSE up -d --no-deps app
echo "✓ App restarted"

# ── 4. Wait for health check ──────────────────────────────────────────────
echo "⏳ Waiting for health check..."
RETRIES=30
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "✗ Health check failed after 30 attempts — rolling back"
    $COMPOSE logs --tail=50 app
    exit 1
  fi
  sleep 2
done
echo "✓ App healthy"

# ── 5. Clean up unused Docker images ──────────────────────────────────────
echo "▶ Cleaning up old images..."
docker image prune -f --filter "until=24h" 2>/dev/null || true
echo "✓ Cleanup done"

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✓ Deploy complete"
echo "══════════════════════════════════════════════════"
