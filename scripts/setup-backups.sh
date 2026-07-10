#!/usr/bin/env bash
# ── Backup-Setup für MasterMind (Hetzner/Root-Server) ──────────────────────
#
# Richtet ein:
#   1. age-Schlüsselpaar (Backups werden mit dem Public-Key verschlüsselt).
#   2. Einen separaten Backup-Ordner mit strengen Rechten (nur root: 0700).
#   3. Den systemd-Timer für tägliche Backups um 03:00.
#
# WARUM age statt gpg: einfacher, moderner, ein einziger Key. Die Backups sind
# damit at-rest verschlüsselt (Art. 32 DSGVO) — selbst wer die Backup-Datei
# klaut, kann sie ohne den Private-Key nicht lesen.
#
# ⚠ WICHTIG: Der age-PRIVATE-Key ist der einzige Weg, Backups wiederherzustellen.
#   Er wird NICHT mit den Backups gelagert (das wäre sinnlos) und MUSS separat
#   sicher aufbewahrt werden (Passwortmanager!). Verlierst du ihn, sind die
#   Backups unwiederbringlich.
#
# Nutzung:  sudo bash scripts/setup-backups.sh
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Bitte mit sudo/root." >&2; exit 1; fi

APP_DIR="${APP_DIR:-/opt/mastermind}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mastermind}"
AGE_KEY_DIR="/root/.config/mastermind"
AGE_KEY_FILE="$AGE_KEY_DIR/backup-age.key"

echo "==> 1) age installieren…"
if ! command -v age >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq && apt-get install -y -qq age >/dev/null
fi

echo "==> 2) age-Schlüsselpaar erzeugen (falls nicht vorhanden)…"
mkdir -p "$AGE_KEY_DIR"; chmod 700 "$AGE_KEY_DIR"
if [[ -f "$AGE_KEY_FILE" ]]; then
  echo "   Key existiert bereits — wird beibehalten."
else
  age-keygen -o "$AGE_KEY_FILE" 2>/dev/null
  chmod 600 "$AGE_KEY_FILE"
  echo "   ✓ Neuer Key erzeugt."
fi
PUBKEY="$(grep -oE 'age1[0-9a-z]+' "$AGE_KEY_FILE" | head -1)"
echo "   Public-Key (für BACKUP_AGE_RECIPIENT): $PUBKEY"

echo "==> 3) Separaten, streng geschützten Backup-Ordner anlegen…"
# Nur root darf lesen/schreiben (0700). Backups liegen verschlüsselt darin —
# doppelter Schutz: Dateisystem-Rechte + age-Verschlüsselung des Inhalts.
mkdir -p "$BACKUP_DIR"
chown root:root "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
echo "   ✓ $BACKUP_DIR (0700, nur root)"

echo "==> 4) BACKUP_AGE_RECIPIENT in .env.production eintragen…"
ENV_FILE="$APP_DIR/.env.production"
if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^BACKUP_AGE_RECIPIENT=' "$ENV_FILE"; then
    sed -i "s|^BACKUP_AGE_RECIPIENT=.*|BACKUP_AGE_RECIPIENT=$PUBKEY|" "$ENV_FILE"
  else
    echo "BACKUP_AGE_RECIPIENT=$PUBKEY" >> "$ENV_FILE"
  fi
  # BACKUP_DIR ebenfalls setzen, damit backup-db.sh den separaten Ordner nutzt
  if grep -q '^BACKUP_DIR=' "$ENV_FILE"; then
    sed -i "s|^BACKUP_DIR=.*|BACKUP_DIR=$BACKUP_DIR|" "$ENV_FILE"
  else
    echo "BACKUP_DIR=$BACKUP_DIR" >> "$ENV_FILE"
  fi
  echo "   ✓ Eingetragen in $ENV_FILE"
else
  echo "   ⚠ $ENV_FILE fehlt — trage BACKUP_AGE_RECIPIENT=$PUBKEY manuell ein."
fi

echo "==> 5) systemd-Timer für 03:00 installieren…"
install -m 0644 "$APP_DIR/ops/systemd/mastermind-backup.service" /etc/systemd/system/
install -m 0644 "$APP_DIR/ops/systemd/mastermind-backup.timer"   /etc/systemd/system/
# APP_DIR im Service auf den echten Pfad setzen
sed -i "s|/opt/mastermind|$APP_DIR|g" /etc/systemd/system/mastermind-backup.service
systemctl daemon-reload
systemctl enable --now mastermind-backup.timer

echo
echo "✓ Backup-Setup fertig."
echo "  Nächster Lauf:"; systemctl list-timers mastermind-backup.timer --no-pager 2>/dev/null | head -2 || true
echo
echo "  ⚠⚠ JETZT den PRIVATE-Key sichern (einmalig, an sicheren Ort / Passwortmanager):"
echo "     cat $AGE_KEY_FILE"
echo "  Ohne diesen Key sind die Backups NICHT wiederherstellbar."
echo
echo "  Sofort testen:  sudo APP_DIR=$APP_DIR bash $APP_DIR/scripts/backup-db.sh"
