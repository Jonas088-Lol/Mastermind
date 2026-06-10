#!/bin/sh
set -e

echo "▶ MasterMind — Starting up..."

# Wait until Postgres is reachable (max 30s)
echo "⏳ Waiting for database..."
RETRIES=30
until node -e "
  const net = require('net');
  const s = net.createConnection(5432, 'db');
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error', () => { s.destroy(); process.exit(1); });
" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "✗ Database not reachable after 30 attempts. Exiting."
    exit 1
  fi
  sleep 1
done
echo "✓ Database reachable."

# Run pending migrations (safe in production — only applies new ones)
echo "⏳ Running migrations..."
node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma
echo "✓ Migrations done."

# Start Next.js standalone server
echo "✓ Starting Next.js on port ${PORT:-3000}..."
exec node server.js
