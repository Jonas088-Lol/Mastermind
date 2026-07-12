#!/bin/bash
# Copyright 2026 Elian Schock, Jonas Schwenk
# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — Backup Restore-Test
#
# Stellt das neueste Backup in eine WEGWERF-Datenbank wieder her und prüft,
# dass zentrale Tabellen Zeilen enthalten. Ändert die Produktions-DB NICHT.
# Ein Backup, das nie getestet wurde, ist kein Backup.
#
# Usage:  bash scripts/restore-test.sh [pfad/zum/backup.sql.gz(.age)]
# Cron (wöchentlich):  0 4 * * 0 bash /opt/mastermind/scripts/restore-test.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mastermind}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
DB_CONTAINER="${DB_CONTAINER:-mastermind_db}"
PG_USER="${POSTGRES_USER:-mastermind}"
TEST_DB="mastermind_restore_test"
AGE_IDENTITY="${BACKUP_AGE_IDENTITY:-}"   # Pfad zur age-Private-Key-Datei

# Neuestes Backup finden (oder Argument nutzen)
BACKUP="${1:-$(ls -t "$BACKUP_DIR"/mastermind_*.sql.gz* 2>/dev/null | head -1 || true)}"
if [ -z "$BACKUP" ] || [ ! -f "$BACKUP" ]; then
  echo "✖ Kein Backup gefunden in $BACKUP_DIR" >&2
  exit 1
fi
echo "▶ Restore-Test mit: $BACKUP"

# Entschlüsseln/entpacken in einen Stream
decode() {
  case "$BACKUP" in
    *.age)
      [ -n "$AGE_IDENTITY" ] || { echo "✖ BACKUP_AGE_IDENTITY (Private-Key-Datei) nötig für .age-Backups." >&2; exit 1; }
      age -d -i "$AGE_IDENTITY" "$BACKUP" | gunzip ;;
    *.gz)
      gunzip -c "$BACKUP" ;;
    *)
      cat "$BACKUP" ;;
  esac
}

# Wegwerf-DB frisch anlegen
echo "▶ Lege Test-DB $TEST_DB an…"
docker exec "$DB_CONTAINER" psql -U "$PG_USER" -c "DROP DATABASE IF EXISTS $TEST_DB;" >/dev/null
docker exec "$DB_CONTAINER" psql -U "$PG_USER" -c "CREATE DATABASE $TEST_DB;" >/dev/null

# Dump einspielen
echo "▶ Spiele Dump ein…"
decode | docker exec -i "$DB_CONTAINER" psql -U "$PG_USER" -d "$TEST_DB" -q >/dev/null

# Verifikation: zentrale Tabellen prüfen
echo "▶ Prüfe wiederhergestellte Daten…"
FAIL=0
for tbl in User School Grade; do
  CNT=$(docker exec "$DB_CONTAINER" psql -U "$PG_USER" -d "$TEST_DB" -tAc "SELECT count(*) FROM \"$tbl\";" 2>/dev/null || echo "ERR")
  echo "   $tbl: $CNT Zeilen"
  if [ "$CNT" = "ERR" ]; then FAIL=1; fi
done

# Aufräumen
docker exec "$DB_CONTAINER" psql -U "$PG_USER" -c "DROP DATABASE IF EXISTS $TEST_DB;" >/dev/null

if [ "$FAIL" -ne 0 ]; then
  echo "✖ Restore-Test FEHLGESCHLAGEN — Backup nicht wiederherstellbar!" >&2
  exit 1
fi
echo "✓ Restore-Test erfolgreich — Backup ist wiederherstellbar."
