#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — PostgreSQL Backup Script
#
# Creates a timestamped gzip-compressed SQL dump.
# Keeps the last 14 backups, deletes older ones automatically.
#
# Usage:  bash scripts/backup-db.sh
# Cron:   0 3 * * * bash /opt/mastermind/scripts/backup-db.sh >> /var/log/mastermind-backup.log 2>&1
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mastermind}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/mastermind_${TIMESTAMP}.sql.gz"

# Load env vars for DB credentials
ENV_FILE="$APP_DIR/.env.production"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^(POSTGRES_|DATABASE_)' "$ENV_FILE")
  set +a
fi

DB_NAME="${POSTGRES_DB:-mastermind}"
DB_USER="${POSTGRES_USER:-mastermind}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup of $DB_NAME..."

mkdir -p "$BACKUP_DIR"

# Dump via running PostgreSQL container
docker compose --env-file "$ENV_FILE" -f "$APP_DIR/docker-compose.yml" exec -T db \
  pg_dump -U "$DB_USER" -Fp --no-owner --no-acl "$DB_NAME" \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Backup created: $BACKUP_FILE ($SIZE)"

# Remove backups older than KEEP_DAYS
DELETED=$(find "$BACKUP_DIR" -name "mastermind_*.sql.gz" -mtime "+$KEEP_DAYS" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted $DELETED old backup(s) (older than $KEEP_DAYS days)"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete. Files in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/mastermind_*.sql.gz 2>/dev/null | tail -5 || true
