#!/bin/sh

echo "▶ MasterMind — Starting up..."

# Wait until Postgres port is open (max 60s).
# Uses only Node built-ins — no npm packages needed in the standalone image.
echo "⏳ Waiting for database..."
RETRIES=60
until node -e "
  const url = new URL(process.env.DATABASE_URL);
  const net = require('net');
  const s = net.createConnection(parseInt(url.port || '5432'), url.hostname);
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error', () => { s.destroy(); process.exit(1); });
" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "✗ Database not reachable after 60 attempts. Exiting."
    exit 1
  fi
  sleep 1
done
echo "✓ Database reachable."

# Sync schema directly from schema.prisma (bypasses SQLite migration files).
# Uses --accept-data-loss so it never hangs waiting for interactive confirmation.
echo "⏳ Syncing database schema (db push)..."
if node node_modules/prisma/build/index.js db push \
    --schema ./prisma/schema.prisma \
    --accept-data-loss \
    --skip-generate; then
  echo "✓ Schema synced."
else
  echo "⚠ db push failed — see logs above. The server will still start."
  echo "  Tip: run 'docker compose exec app node node_modules/prisma/build/index.js db push --schema ./prisma/schema.prisma --accept-data-loss' manually."
fi

# Seed initial demo data (idempotent — all writes use upsert).
if [ -f "prisma/seed.cjs" ]; then
  echo "⏳ Seeding initial data..."
  if node prisma/seed.cjs; then
    echo "✓ Seed done."
  else
    echo "⚠ Seed failed — demo data may be incomplete. Check logs above."
  fi
fi

# Start Next.js standalone server
echo "✓ Starting Next.js on port ${PORT:-3000}..."
exec node server.js
