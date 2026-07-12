#!/bin/bash
# Copyright 2026 Elian Schock, Jonas Schwenk
# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — Automatischer APK-Build (Debug & Release)
#
# Voraussetzungen:
#   - Android Studio oder Android SDK (ANDROID_HOME gesetzt)
#   - Java 17+ (JDK)
#   - Node.js + npm
#
# Verwendung:
#   bash scripts/build-apk.sh                    → Debug-APK
#   bash scripts/build-apk.sh debug              → Debug-APK
#   bash scripts/build-apk.sh release            → Release-APK (unsigned)
#   CAPACITOR_APP_URL=https://meineschule.de \
#     bash scripts/build-apk.sh debug            → mit eigenem Server
#
# Output: android/app/build/outputs/apk/{debug|release}/app-{debug|release}.apk
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

BUILD_TYPE="${1:-debug}"
APP_URL="${CAPACITOR_APP_URL:-https://konvertis.de}"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  MasterMind APK Builder                          ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Build-Typ:  $BUILD_TYPE"
echo "║  Server URL: $APP_URL"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Prüfe Voraussetzungen ──────────────────────────────────────────────────
if [ ! -d "android" ]; then
  echo "✗ Android-Verzeichnis nicht gefunden."
  echo "  Führe zuerst aus: npx cap add android"
  exit 1
fi

if [ -z "${ANDROID_HOME:-}" ]; then
  # Versuche Standard-Pfade
  if [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  elif [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  else
    echo "✗ ANDROID_HOME nicht gesetzt."
    echo "  Setze ANDROID_HOME=/pfad/zum/android/sdk"
    exit 1
  fi
fi

echo "✓ Android SDK: $ANDROID_HOME"

# ── Capacitor Sync ─────────────────────────────────────────────────────────
echo ""
echo "▶ Synchronisiere Capacitor (Server: $APP_URL)..."
CAPACITOR_APP_URL="$APP_URL" npx cap sync android
echo "✓ Sync abgeschlossen"

# ── Gradle Build ───────────────────────────────────────────────────────────
echo ""
echo "▶ Baue $BUILD_TYPE APK..."
cd android

# Setze Gradle Properties für Performance
export GRADLE_OPTS="-Xmx2g -XX:MaxMetaspaceSize=512m"

if [ "$BUILD_TYPE" = "release" ]; then
  ./gradlew assembleRelease --quiet
  APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
  # Falls keystore vorhanden: sign
  if [ -f "../keystore.jks" ] && [ -n "${KEYSTORE_PASSWORD:-}" ]; then
    echo "▶ Signiere Release-APK..."
    "$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | tail -1)/apksigner" sign \
      --ks ../keystore.jks \
      --ks-pass "pass:$KEYSTORE_PASSWORD" \
      --key-pass "pass:${KEY_PASSWORD:-$KEYSTORE_PASSWORD}" \
      --out "app/build/outputs/apk/release/app-release.apk" \
      "$APK_PATH"
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    echo "✓ APK signiert"
  fi
else
  ./gradlew assembleDebug --quiet
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

# ── Ergebnis ──────────────────────────────────────────────────────────────
FULL_PATH="android/$APK_PATH"
if [ -f "$FULL_PATH" ]; then
  SIZE=$(du -sh "$FULL_PATH" | cut -f1)
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║  ✓ APK erfolgreich erstellt!                     ║"
  echo "╠══════════════════════════════════════════════════╣"
  echo "║  Datei:  $FULL_PATH"
  echo "║  Größe:  $SIZE"
  echo "╠══════════════════════════════════════════════════╣"
  echo "║  Installation auf Gerät:                         ║"
  echo "║  adb install $FULL_PATH"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""

  # Kopiere in Projekt-Root für einfachen Zugang
  cp "$FULL_PATH" "./mastermind-${BUILD_TYPE}.apk"
  echo "  Auch kopiert nach: ./mastermind-${BUILD_TYPE}.apk"
else
  echo "✗ APK nicht gefunden: $FULL_PATH"
  exit 1
fi
