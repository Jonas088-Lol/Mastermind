#!/usr/bin/env bash
# Copyright 2026 Elian Schock, Jonas Schwenk
#
# Sammelt die lokal gebauten App-Installer, benennt sie auf die von der
# Download-Seite erwarteten Namen und legt sie in ./downloads/ ab.
# Anschließend werden sie per scp auf den Server geladen (nginx serviert sie
# unter /downloads/).
#
# Voraussetzung: vorher lokal bauen
#   Desktop:  npm run desktop:build:mac   (bzw. :win / :linux)
#   Android:  (cd flutter_app && flutter build apk --release)
#
# Nutzung:
#   scripts/package-apps.sh                 # nur sammeln/umbenennen
#   scripts/package-apps.sh --upload        # zusätzlich hochladen
#
# Server-Ziel per Env überschreibbar:
#   DEPLOY_HOST=user@server DEPLOY_PATH=/srv/mastermind/downloads scripts/package-apps.sh --upload

set -euo pipefail
cd "$(dirname "$0")/.."

DEST="downloads"
DIST="electron/dist"
APK="flutter_app/build/app/outputs/flutter-apk/app-release.apk"

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/srv/mastermind/downloads}"

mkdir -p "$DEST"

# Kopiert die erste passende Datei (Glob) auf einen Zielnamen.
grab() {
  local pattern="$1" target="$2"
  # shellcheck disable=SC2206
  local matches=( $pattern )
  if [ -e "${matches[0]}" ]; then
    cp -f "${matches[0]}" "$DEST/$target"
    echo "  ✓ $target  ←  ${matches[0]}"
  else
    echo "  – übersprungen: $target (kein Build gefunden: $pattern)"
  fi
}

echo "Sammle App-Builds → $DEST/"
grab "$DIST/MasterMind-mac-*.dmg"      "mastermind-mac.dmg"
grab "$DIST/MasterMind-Setup-*.exe"    "mastermind-windows-setup.exe"
grab "$DIST/MasterMind-*.AppImage"     "mastermind-linux.AppImage"
grab "$APK"                            "mastermind.apk"

# versions.json aktualisieren (Datum)
DATE="$(date +%Y-%m-%d)"
cat > "$DEST/versions.json" <<EOF
{
  "releaseDate": "$DATE",
  "version": "1.0.0",
  "note": "Build vom $DATE"
}
EOF
echo "  ✓ versions.json ($DATE)"

echo
echo "Fertig in ./$DEST/:"
ls -lh "$DEST" | grep -v '^total' || true

if [ "${1:-}" = "--upload" ]; then
  if [ -z "$DEPLOY_HOST" ]; then
    echo
    echo "FEHLER: DEPLOY_HOST nicht gesetzt. Beispiel:"
    echo "  DEPLOY_HOST=root@konvertis.de scripts/package-apps.sh --upload"
    exit 1
  fi
  echo
  echo "Lade hoch nach $DEPLOY_HOST:$DEPLOY_PATH ..."
  ssh "$DEPLOY_HOST" "mkdir -p '$DEPLOY_PATH'"
  scp "$DEST"/mastermind*.{dmg,exe,AppImage,apk} "$DEST"/versions.json \
      "$DEPLOY_HOST:$DEPLOY_PATH/" 2>/dev/null || \
    scp "$DEST"/* "$DEPLOY_HOST:$DEPLOY_PATH/"
  echo "✓ Hochgeladen. nginx serviert sie sofort unter /downloads/."
else
  echo
  echo "Zum Hochladen auf den Server:"
  echo "  DEPLOY_HOST=root@konvertis.de scripts/package-apps.sh --upload"
  echo "oder manuell:"
  echo "  scp $DEST/mastermind-mac.dmg root@konvertis.de:$DEPLOY_PATH/"
fi
