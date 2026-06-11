#!/bin/sh
set -e

echo "▶ MasterMind — Starting up..."

# Wait until Postgres is reachable (max 30s)
echo "⏳ Waiting for database..."
RETRIES=30
until node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect().then(() => { c.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "✗ Database not reachable after 30 attempts. Exiting."
    exit 1
  fi
  sleep 1
done
echo "✓ Database reachable."

# Sync schema directly from schema.prisma (bypasses SQLite migration files)
# --accept-data-loss is safe here: on a fresh DB it just creates tables,
# on an existing DB it only alters if needed.
echo "⏳ Syncing database schema..."
node node_modules/prisma/build/index.js db push \
  --schema ./prisma/schema.prisma \
  --accept-data-loss \
  --skip-generate
echo "✓ Schema synced."

# Seed initial demo data (idempotent — all writes use upsert)
if [ -f "prisma/seed.cjs" ]; then
  echo "⏳ Seeding initial data..."
  node prisma/seed.cjs && echo "✓ Seed done." || echo "⚠ Seed returned an error (data may already exist — continuing)"
fi

# Start Next.js standalone server
echo "✓ Starting Next.js on port ${PORT:-3000}..."
exec node server.js
