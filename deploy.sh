#!/bin/bash
set -e

echo "=== MasterMind Deploy ==="

# ── 1. Lade alle .env Dateien ─────────────────────────────────────────────
for envfile in .env .env.production .env.local; do
  if [ -f "$envfile" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$envfile"
    set +a
  fi
done

# ── 2. Suche DATABASE_URL unter allen bekannten Variablennamen ────────────
FOUND_URL="${DATABASE_URL:-${POSTGRES_URL:-${POSTGRES_PRISMA_URL:-${POSTGRES_CONNECTION_STRING:-${DB_URL:-${PG_URL:-${DIRECT_URL:-}}}}}}}"

# Scan .env Dateien nach postgres:// URLs
if [ -z "$FOUND_URL" ]; then
  for envfile in .env .env.production .env.local; do
    if [ -f "$envfile" ]; then
      FOUND_URL=$(grep -v '^#' "$envfile" | grep -oP '(postgresql|postgres)://[^\s"'\'']+' | head -1 || true)
      [ -n "$FOUND_URL" ] && break
    fi
  done
fi

# ── 3. Automatische Erkennung via System-PostgreSQL ───────────────────────
if [ -z "$FOUND_URL" ]; then
  echo "Erkenne PostgreSQL-Konfiguration automatisch..."

  PG_PASS="${POSTGRES_PASSWORD:-}"
  DB_NAME="mastermind"

  # Versuche Verbindung als postgres-Systembenutzer (Ubuntu Standard: peer auth)
  if command -v psql &>/dev/null && sudo -u postgres psql -c '\q' 2>/dev/null; then
    echo "✅ PostgreSQL erreichbar (peer auth)"

    # Erstelle Datenbank falls nicht vorhanden
    if ! sudo -u postgres psql -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
      echo "Erstelle Datenbank '$DB_NAME'..."
      sudo -u postgres createdb "$DB_NAME" 2>/dev/null || true
    fi

    if [ -n "$PG_PASS" ]; then
      # Stelle sicher dass postgres-User das Passwort hat
      sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${PG_PASS}';" 2>/dev/null || true
      FOUND_URL="postgresql://postgres:${PG_PASS}@localhost:5432/${DB_NAME}"
    else
      # Ohne Passwort: Unix-Socket verwenden
      FOUND_URL="postgresql://postgres@localhost:5432/${DB_NAME}"
    fi

    # Speichere URL in .env für spätere Aufrufe
    if ! grep -q "^DATABASE_URL=" .env 2>/dev/null; then
      echo "DATABASE_URL=\"${FOUND_URL}\"" >> .env
      echo "✅ DATABASE_URL in .env gespeichert"
    fi

  # Fallback: Baue URL aus POSTGRES_* Einzelvariablen
  elif [ -n "$PG_PASS" ]; then
    PG_USER="${POSTGRES_USER:-postgres}"
    PG_HOST="${POSTGRES_HOST:-localhost}"
    PG_PORT="${POSTGRES_PORT:-5432}"
    PG_DB="${POSTGRES_DB:-${DB_NAME}}"
    FOUND_URL="postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}"
    echo "⚠️  URL aus Einzelvariablen gebaut"

    # Speichere URL in .env
    if ! grep -q "^DATABASE_URL=" .env 2>/dev/null; then
      echo "DATABASE_URL=\"${FOUND_URL}\"" >> .env
      echo "✅ DATABASE_URL in .env gespeichert"
    fi
  fi
fi

# ── 4. Abbruch falls nichts gefunden ─────────────────────────────────────
if [ -z "$FOUND_URL" ]; then
  echo ""
  echo "❌ Keine PostgreSQL-URL gefunden."
  echo "Vorhandene Variablen in .env:"
  grep -v '^#' .env | cut -d= -f1 | sort
  echo ""
  echo "Bitte füge in .env ein:"
  echo "  DATABASE_URL=\"postgresql://user:passwort@localhost:5432/mastermind\""
  exit 1
fi

export DATABASE_URL="$FOUND_URL"
echo "✅ Datenbank: ${DATABASE_URL:0:60}..."

# ── 5. Prisma Schema Push ─────────────────────────────────────────────────
echo ""
echo "--- Prisma Schema Push ---"
npx prisma@6.19.3 db push --schema prisma/schema.postgres.prisma

# ── 6. Next.js Build ──────────────────────────────────────────────────────
echo ""
echo "--- Next.js Build ---"
npm run build

# ── 7. PM2 Restart ────────────────────────────────────────────────────────
echo ""
echo "--- PM2 Restart ---"
pm2 restart all

echo ""
echo "=== Deploy abgeschlossen ==="
