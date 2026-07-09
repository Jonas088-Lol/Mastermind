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

# Fix known NOT NULL violations before db push.
# If a column exists but has NULL values, Prisma refuses to make it required.
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const n = await p.\$executeRawUnsafe('UPDATE \"School\" SET \"featureSettings\" = \'{}\'::jsonb WHERE \"featureSettings\" IS NULL');
    if (n > 0) console.log('Fixed ' + n + ' School rows with NULL featureSettings');
  } catch(e) { /* column may not exist yet — ok */ }
  await p.\$disconnect();
})().catch(() => {});
" 2>/dev/null || true

# Sync schema directly from schema.prisma (bypasses SQLite migration files).
# Uses --accept-data-loss so it never hangs waiting for interactive confirmation.
echo "⏳ Syncing database schema (db push)..."
if node /prisma-cli/node_modules/prisma/build/index.js db push \
    --schema ./prisma/schema.prisma \
    --accept-data-loss \
    --skip-generate; then
  echo "✓ Schema synced."
else
  echo "⚠ db push failed — see logs above. The server will still start."
  echo "  Tip: run 'docker compose exec app node /prisma-cli/node_modules/prisma/build/index.js db push --schema ./prisma/schema.prisma --accept-data-loss' manually."
fi

# Demo-Seed: NUR auf ausdrückliche Anforderung.
# Der Seed legt Konten mit bekannten Passwörtern an (inkl. eines super-Admins)
# und überschreibt bestehende Passwort-Hashes. Er darf niemals automatisch
# gegen eine produktive Datenbank laufen.
if [ "$ALLOW_DEMO_SEED" = "true" ] && [ -f "prisma/seed.cjs" ]; then
  echo "⚠ ALLOW_DEMO_SEED=true — seeding demo data with KNOWN passwords."
  if node prisma/seed.cjs; then
    echo "✓ Seed done."
  else
    echo "⚠ Seed failed — check logs above."
  fi
else
  echo "✓ Demo seed skipped (set ALLOW_DEMO_SEED=true to enable — never in production)."
fi

# Start Next.js standalone server
echo "✓ Starting Next.js on port ${PORT:-3000}..."
exec node server.js
