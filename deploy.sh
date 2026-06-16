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

# If still empty, scan .env files for any postgres:// URL value
if [ -z "$FOUND_URL" ]; then
  for envfile in .env .env.production .env.local; do
    if [ -f "$envfile" ]; then
      FOUND_URL=$(grep -v '^#' "$envfile" | grep -oP '(postgresql|postgres)://[^\s"'\'']+' | head -1 || true)
      [ -n "$FOUND_URL" ] && break
    fi
  done
fi

# If still empty, try to construct from individual POSTGRES_* parts
if [ -z "$FOUND_URL" ] && [ -n "$POSTGRES_PASSWORD" ]; then
  PG_USER="${POSTGRES_USER:-${PGUSER:-postgres}}"
  PG_HOST="${POSTGRES_HOST:-${PGHOST:-localhost}}"
  PG_PORT="${POSTGRES_PORT:-${PGPORT:-5432}}"
  PG_DB="${POSTGRES_DB:-${PGDATABASE:-mastermind}}"
  FOUND_URL="postgresql://${PG_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB}"
  echo "⚠️  URL aus Einzelvariablen gebaut: ${FOUND_URL:0:50}..."
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
