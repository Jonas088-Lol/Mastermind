#!/usr/bin/env bash
# ── Play-Store-Build (signiertes AAB) für MasterMind ───────────────────────
#
# Der Play Store nimmt App Bundles (.aab), keine .apk. Dieses Skript:
#   1. synchronisiert die Capacitor-Config in das Android-Projekt
#   2. baut ein signiertes Release-AAB
#
# Voraussetzungen:
#   - JDK 17, Android SDK (ANDROID_HOME gesetzt)
#   - android/mastermind.keystore + android/keystore.properties vorhanden
#     (siehe scripts/android-create-keystore.sh)
#
# Nutzung:
#   bash scripts/build-playstore.sh
#   CAPACITOR_APP_URL=https://konvertis.de bash scripts/build-playstore.sh
#
# Output: android/app/build/outputs/bundle/release/app-release.aab
set -euo pipefail

export CAPACITOR_APP_URL="${CAPACITOR_APP_URL:-https://konvertis.de}"

echo "▶ Server-URL: $CAPACITOR_APP_URL"

if [[ ! -f android/keystore.properties ]]; then
  echo "✖ android/keystore.properties fehlt — erst scripts/android-create-keystore.sh ausführen." >&2
  exit 1
fi

echo "▶ Capacitor sync (Config → Android-Projekt)…"
npx cap sync android

# versionCode automatisch hochzählen (Play verlangt bei jedem Upload einen höheren)
bash scripts/bump-version-code.sh

echo "▶ Signiertes AAB bauen…"
cd android
if [[ -f ./gradlew ]]; then
  ./gradlew bundleRelease
else
  gradle bundleRelease
fi
cd ..

AAB="android/app/build/outputs/bundle/release/app-release.aab"
if [[ -f "$AAB" ]]; then
  echo
  echo "✓ Fertig: $AAB"
  echo "  Diese Datei lädst du in der Play Console hoch (Production → Create release)."
else
  echo "✖ AAB nicht gefunden — Build-Log oben prüfen." >&2
  exit 1
fi
