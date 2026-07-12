#!/usr/bin/env bash
# Copyright 2026 Elian Schock, Jonas Schwenk
# ── Android Upload-Keystore erzeugen (einmalig) ────────────────────────────
#
# Der Keystore signiert deine App. Google identifiziert deine App über diesen
# Schlüssel — verlierst du ihn, kannst du NIE WIEDER ein Update der App
# hochladen (nur eine komplett neue App unter neuem Namen). Deshalb:
#
#   ⚠⚠ NACH dem Erzeugen: android/mastermind.keystore + das Passwort SOFORT
#      an einem sicheren Ort sichern (Passwortmanager + Offsite-Backup).
#      Der Keystore ist NICHT im Git (steht in .gitignore) — er existiert nur
#      auf deinem Rechner. Geht dein Rechner kaputt und du hast kein Backup,
#      ist die App-Identität für immer verloren.
#
# Nutzung (Windows Git-Bash / Linux):  bash scripts/android-create-keystore.sh
set -euo pipefail

KEYSTORE="android/mastermind.keystore"
ALIAS="mastermind"

if [[ -f "$KEYSTORE" ]]; then
  echo "✖ $KEYSTORE existiert bereits — wird NICHT überschrieben."
  echo "  (Ein neuer Keystore würde die App-Identität ändern!)"
  exit 1
fi

command -v keytool >/dev/null || { echo "keytool nicht gefunden — JDK 17 installieren." >&2; exit 1; }

echo "Erzeuge Upload-Keystore. Du wirst nach einem Passwort gefragt —"
echo "wähle ein starkes und MERKE es dir (Passwortmanager!)."
echo

keytool -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storetype PKCS12

echo
echo "✓ Keystore erstellt: $KEYSTORE"
echo
echo "Jetzt android/keystore.properties anlegen (NICHT ins Git — steht in .gitignore):"
cat <<'EOF'

  # Datei: android/keystore.properties
  storeFile=mastermind.keystore
  storePassword=DEIN_PASSWORT
  keyAlias=mastermind
  keyPassword=DEIN_PASSWORT

EOF
echo "⚠ Sichere JETZT $KEYSTORE + das Passwort extern. Ohne sie keine App-Updates."
