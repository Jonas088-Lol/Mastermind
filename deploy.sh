#!/bin/bash
set -e

echo "=== MasterMind Deploy ==="

# Load variables from .env and .env.production
for envfile in .env .env.production; do
  if [ -f "$envfile" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$envfile"
    set +a
  fi
done

# Try common postgres URL variable names in priority order
FOUND_URL="${DATABASE_URL:-${POSTGRES_URL:-${POSTGRES_PRISMA_URL:-${POSTGRES_CONNECTION_STRING:-${DB_URL:-${PG_URL:-${DIRECT_URL:-}}}}}}}"

# If still empty, try to find any variable that starts with postgres:// or postgresql://
if [ -z "$FOUND_URL" ] && [ -f .env ]; then
  FOUND_URL=$(grep -v '^#' .env | grep -oP '(postgresql|postgres)://[^\s"'\'']+' | head -1 || true)
fi

if [ -z "$FOUND_URL" ]; then
  echo ""
  echo "❌ Keine PostgreSQL-URL gefunden. Folgende Variablen sind in .env vorhanden:"
  grep -v '^#' .env | cut -d= -f1 | sort
  echo ""
  echo "Lösung: Füge in .env folgendes hinzu:"
  echo "  DATABASE_URL=\"postgresql://user:password@host:5432/dbname\""
  exit 1
fi

export DATABASE_URL="$FOUND_URL"
echo "✅ Datenbank: ${DATABASE_URL:0:50}..."

echo ""
echo "--- Prisma Schema Push ---"
npx prisma@6.19.3 db push --schema prisma/schema.postgres.prisma

echo ""
echo "--- Next.js Build ---"
npm run build

echo ""
echo "--- PM2 Restart ---"
pm2 restart all

echo ""
echo "=== Deploy abgeschlossen ==="
