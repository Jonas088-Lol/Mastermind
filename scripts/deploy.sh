#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — Deploy Script (Docker)
#
# Baut nur den App-Container neu (db + nginx bleiben oben).
# Wartet auf den Health-Check bevor es fertig meldet.
#
# Usage: bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

# Projektverzeichnis automatisch ermitteln (wo dieses Script liegt /../)
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose --env-file .env.production"

echo "══════════════════════════════════════════════════"
echo "  MasterMind Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Dir: $APP_DIR"
echo "══════════════════════════════════════════════════"

cd "$APP_DIR"

# ── 1. .env.production prüfen ──────────────────────────────────────────────
if [ ! -f .env.production ]; then
  echo "❌ .env.production fehlt — Setup noch nicht abgeschlossen"
  echo "   Erstelle sie aus: cp .env.production.example .env.production"
  exit 1
fi

# ── 2. Neuesten Code holen ─────────────────────────────────────────────────
echo "▶ Git Pull..."
git pull
echo "✓ Code aktuell ($(git rev-parse --short HEAD))"

# ── 3. Nur App-Container neu bauen (db + nginx bleiben oben) ──────────────
echo "▶ App-Container wird gebaut..."
$COMPOSE build app
echo "✓ Build fertig"

# ── 4. App-Container neu starten ──────────────────────────────────────────
echo "▶ App wird gestartet..."
$COMPOSE up -d --no-deps app
echo "✓ App gestartet"

# ── 5. Health-Check abwarten ──────────────────────────────────────────────
echo "⏳ Warte auf Health-Check..."
RETRIES=30
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "✗ Health-Check fehlgeschlagen — Logs:"
    $COMPOSE logs --tail=50 app
    exit 1
  fi
  sleep 2
done
echo "✓ App läuft"

# ── 6. Alte Docker-Images aufräumen ───────────────────────────────────────
docker image prune -f --filter "until=24h" 2>/dev/null || true

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✓ Deploy abgeschlossen"
echo "══════════════════════════════════════════════════"
