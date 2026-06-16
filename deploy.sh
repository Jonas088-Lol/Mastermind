#!/bin/bash
set -e

echo "=== MasterMind Deploy (Docker) ==="

# Prüfe ob .env.production existiert
if [ ! -f .env.production ]; then
  echo "❌ .env.production nicht gefunden"
  echo "Erstelle sie aus dem Beispiel: cp .env.production.example .env.production"
  exit 1
fi

echo "✅ .env.production gefunden"

# Neuen Code holen
echo ""
echo "--- Git Pull ---"
git pull

# Docker Image bauen und alle Container neu starten
echo ""
echo "--- Docker Build & Start ---"
docker compose --env-file .env.production up -d --build

echo ""
echo "=== Deploy abgeschlossen ==="
echo "App läuft unter: $(grep NEXT_PUBLIC_APP_URL .env.production | cut -d= -f2-)"
