#!/bin/bash
# Copyright 2026 Elian Schock, Jonas Schwenk
# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — PostgreSQL Backup Script
#
# Creates a timestamped gzip-compressed SQL dump.
# Backups enthalten personenbezogene Daten (Art. 32 DSGVO) → sie werden
# verschlüsselt, sobald BACKUP_AGE_RECIPIENT gesetzt ist (age-Public-Key).
# Ohne Recipient wird — mit deutlicher Warnung — unverschlüsselt gesichert.
# Keeps the last KEEP_DAYS backups, deletes older ones automatically.
#
# Usage:  bash scripts/backup-db.sh
# Cron:   0 3 * * * bash /opt/mastermind/scripts/backup-db.sh >> /var/log/mastermind-backup.log 2>&1
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mastermind}"

# ENV zuerst laden (DB-Credentials UND Backup-Einstellungen), damit die aus der
# .env.production stammenden BACKUP_-Werte auch beim systemd-Timer greifen.
ENV_FILE="$APP_DIR/.env.production"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^(POSTGRES_|DATABASE_|BACKUP_|KEEP_DAYS)' "$ENV_FILE")
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
AGE_RECIPIENT="${BACKUP_AGE_RECIPIENT:-}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
if [ -n "$AGE_RECIPIENT" ]; then
  BACKUP_FILE="$BACKUP_DIR/mastermind_${TIMESTAMP}.sql.gz.age"
else
  BACKUP_FILE="$BACKUP_DIR/mastermind_${TIMESTAMP}.sql.gz"
fi

DB_NAME="${POSTGRES_DB:-mastermind}"
DB_USER="${POSTGRES_USER:-mastermind}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup of $DB_NAME..."

mkdir -p "$BACKUP_DIR"

# Dump via running PostgreSQL container → gzip → (optional) age-Verschlüsselung.
# Kein Klartext-Dump landet auf der Platte, wenn verschlüsselt wird.
if [ -n "$AGE_RECIPIENT" ]; then
  command -v age >/dev/null 2>&1 || { echo "✖ 'age' nicht installiert, Verschlüsselung nicht möglich." >&2; exit 1; }
  docker compose --env-file "$ENV_FILE" -f "$APP_DIR/docker-compose.yml" exec -T db \
    pg_dump -U "$DB_USER" -Fp --no-owner --no-acl "$DB_NAME" \
    | gzip | age -r "$AGE_RECIPIENT" -o "$BACKUP_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔒 Backup verschlüsselt (age)."
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ BACKUP_AGE_RECIPIENT nicht gesetzt — UNVERSCHLÜSSELTES Backup (enthält PII!)."
  docker compose --env-file "$ENV_FILE" -f "$APP_DIR/docker-compose.yml" exec -T db \
    pg_dump -U "$DB_USER" -Fp --no-owner --no-acl "$DB_NAME" \
    | gzip > "$BACKUP_FILE"
fi

if [ ! -s "$BACKUP_FILE" ]; then
  echo "✖ Backup-Datei ist leer — Fehler." >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Backup created: $BACKUP_FILE ($SIZE)"

# Remove backups older than KEEP_DAYS (beide Endungen)
DELETED=$(find "$BACKUP_DIR" \( -name "mastermind_*.sql.gz" -o -name "mastermind_*.sql.gz.age" \) -mtime "+$KEEP_DAYS" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted $DELETED old backup(s) (older than $KEEP_DAYS days)"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete. Files in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/mastermind_*.sql.gz 2>/dev/null | tail -5 || true
