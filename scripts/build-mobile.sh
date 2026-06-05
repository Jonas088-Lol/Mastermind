#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — Mobile App Build Script
#
# Prerequisites:
#   Android: Android Studio + SDK installed, ANDROID_HOME set
#   iOS:     Xcode + CocoaPods installed (macOS only)
#
# Usage:
#   bash scripts/build-mobile.sh android   → Build & open Android Studio
#   bash scripts/build-mobile.sh ios        → Build & open Xcode (macOS only)
#   bash scripts/build-mobile.sh sync       → Sync web assets to native projects
#   bash scripts/build-mobile.sh all        → Init + sync + open both
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

TARGET="${1:-sync}"
APP_URL="${CAPACITOR_APP_URL:-https://app.mastermind.app}"

echo "══════════════════════════════════════════════════"
echo "  MasterMind Mobile Build"
echo "  Target: $TARGET | App URL: $APP_URL"
echo "══════════════════════════════════════════════════"

# ── Check Capacitor CLI ────────────────────────────────────────────────────
if ! npx cap --version &>/dev/null; then
  echo "✗ Capacitor CLI not found. Run: npm install"
  exit 1
fi

# ── Sync assets + config to native projects ────────────────────────────────
sync_native() {
  echo "▶ Syncing Capacitor..."
  CAPACITOR_APP_URL="$APP_URL" npx cap sync
  echo "✓ Sync complete"
}

# ── Android ────────────────────────────────────────────────────────────────
build_android() {
  if [ ! -d "android" ]; then
    echo "▶ Adding Android platform..."
    npx cap add android
  fi

  sync_native

  echo "▶ Opening Android Studio..."
  npx cap open android
  echo ""
  echo "  In Android Studio:"
  echo "  1. Wait for Gradle sync to finish"
  echo "  2. Build → Generate Signed Bundle/APK"
  echo "  3. Choose: Android App Bundle (.aab) for Play Store"
  echo "             APK (.apk) for direct install"
}

# ── iOS ────────────────────────────────────────────────────────────────────
build_ios() {
  if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "✗ iOS builds require macOS with Xcode installed."
    exit 1
  fi

  if ! command -v pod &>/dev/null; then
    echo "▶ Installing CocoaPods..."
    sudo gem install cocoapods
  fi

  if [ ! -d "ios" ]; then
    echo "▶ Adding iOS platform..."
    npx cap add ios
  fi

  sync_native

  echo "▶ Installing CocoaPods dependencies..."
  cd ios/App && pod install && cd ../..

  echo "▶ Opening Xcode..."
  npx cap open ios
  echo ""
  echo "  In Xcode:"
  echo "  1. Select your Team in Signing & Capabilities"
  echo "  2. Product → Archive"
  echo "  3. Distribute App → App Store Connect"
}

# ── Generate app icons (requires ImageMagick) ──────────────────────────────
generate_icons() {
  if ! command -v convert &>/dev/null; then
    echo "⚠️  ImageMagick not found — skipping icon generation"
    echo "   Install: brew install imagemagick  OR  apt install imagemagick"
    return
  fi

  SOURCE="public/icon-source.png"
  if [ ! -f "$SOURCE" ]; then
    echo "⚠️  No icon source found at $SOURCE — skipping icon generation"
    echo "   Place a 1024x1024 PNG at $SOURCE and re-run"
    return
  fi

  echo "▶ Generating icons from $SOURCE..."

  # Android adaptive icon
  mkdir -p android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}
  convert "$SOURCE" -resize 48x48   android/app/src/main/res/mipmap-mdpi/ic_launcher.png
  convert "$SOURCE" -resize 72x72   android/app/src/main/res/mipmap-hdpi/ic_launcher.png
  convert "$SOURCE" -resize 96x96   android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
  convert "$SOURCE" -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
  convert "$SOURCE" -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

  # iOS icons
  mkdir -p ios/App/App/Assets.xcassets/AppIcon.appiconset
  for SIZE in 20 29 40 58 60 76 80 87 120 152 167 180 1024; do
    convert "$SOURCE" -resize "${SIZE}x${SIZE}" "ios/App/App/Assets.xcassets/AppIcon.appiconset/Icon-${SIZE}.png"
  done

  echo "✓ Icons generated"
}

# ── Generate splash screens ────────────────────────────────────────────────
generate_splash() {
  if ! command -v convert &>/dev/null; then return; fi
  SOURCE="public/splash-source.png"
  if [ ! -f "$SOURCE" ]; then return; fi

  echo "▶ Generating splash screens..."
  # Android splash (2048x2048 recommended)
  convert "$SOURCE" -resize 2048x2048 -background "#0d1117" -gravity center -extent 2048x2048 \
    android/app/src/main/res/drawable/splash.png

  echo "✓ Splash screens generated"
}

# ── Main ───────────────────────────────────────────────────────────────────
case "$TARGET" in
  android)
    build_android
    ;;
  ios)
    build_ios
    ;;
  sync)
    sync_native
    ;;
  icons)
    generate_icons
    generate_splash
    ;;
  all)
    generate_icons
    generate_splash
    build_android
    if [[ "$OSTYPE" == "darwin"* ]]; then build_ios; fi
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Usage: $0 android|ios|sync|icons|all"
    exit 1
    ;;
esac

echo "══════════════════════════════════════════════════"
echo "  ✓ Mobile build script complete"
echo "══════════════════════════════════════════════════"
