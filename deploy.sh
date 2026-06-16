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

PG_PASS="${POSTGRES_PASSWORD:-MasterMind2024!}"
PG_USER="postgres"
PG_HOST="localhost"
PG_PORT="5432"
PG_DB="mastermind"

# ── 2. PostgreSQL installieren falls nicht vorhanden ──────────────────────
if ! command -v psql &>/dev/null; then
  echo "PostgreSQL nicht gefunden — wird installiert..."
  apt-get update -q
  apt-get install -y postgresql postgresql-client
  echo "✅ PostgreSQL installiert"
fi

# ── 3. PostgreSQL starten falls nicht aktiv ───────────────────────────────
if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -q 2>/dev/null; then
  echo "Starte PostgreSQL..."
  service postgresql start 2>/dev/null || systemctl start postgresql 2>/dev/null || true
  sleep 2
fi

if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -q 2>/dev/null; then
  echo "❌ PostgreSQL konnte nicht gestartet werden"
  exit 1
fi
echo "✅ PostgreSQL läuft"

# ── 4. Passwort für postgres-User setzen ─────────────────────────────────
sudo -u postgres psql -c "ALTER USER ${PG_USER} WITH PASSWORD '${PG_PASS}';" 2>/dev/null || true

# ── 5. Datenbank erstellen falls nicht vorhanden ──────────────────────────
if ! sudo -u postgres psql -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$PG_DB"; then
  echo "Erstelle Datenbank '${PG_DB}'..."
  sudo -u postgres createdb "$PG_DB" 2>/dev/null || true
  echo "✅ Datenbank '${PG_DB}' erstellt"
else
  echo "✅ Datenbank '${PG_DB}' bereits vorhanden"
fi

# ── 6. DATABASE_URL setzen und in .env speichern ──────────────────────────
export DATABASE_URL="postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}"

if grep -q "^DATABASE_URL=" .env 2>/dev/null; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
else
  echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
fi

echo "✅ Datenbank: ${DATABASE_URL:0:60}..."

# ── 7. Prisma Schema Push ─────────────────────────────────────────────────
echo ""
echo "--- Prisma Schema Push ---"
npx prisma@6.19.3 db push --schema prisma/schema.postgres.prisma

# ── 8. Next.js Build ──────────────────────────────────────────────────────
echo ""
echo "--- Next.js Build ---"
NODE_OPTIONS="--max-old-space-size=1536" npm run build

# ── 9. PM2 Restart ────────────────────────────────────────────────────────
echo ""
echo "--- PM2 Restart ---"
pm2 restart all

echo ""
echo "=== Deploy abgeschlossen ==="
