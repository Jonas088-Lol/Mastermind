#!/usr/bin/env bash
# ── versionCode +1 ─────────────────────────────────────────────────────────
# Google Play verlangt bei JEDEM neuen Upload einen höheren versionCode.
# Dieses Skript erhöht ihn in android/app/build.gradle automatisch um 1.
# Wird von scripts/build-playstore.sh vor dem Build aufgerufen.
set -euo pipefail

GRADLE="android/app/build.gradle"
[[ -f "$GRADLE" ]] || { echo "✖ $GRADLE nicht gefunden" >&2; exit 1; }

current=$(grep -oE 'versionCode[[:space:]]+[0-9]+' "$GRADLE" | grep -oE '[0-9]+')
[[ -n "$current" ]] || { echo "✖ versionCode nicht gefunden" >&2; exit 1; }
next=$((current + 1))

# In-place ersetzen (portabel: temporäre Datei statt sed -i Varianten)
sed "s/versionCode[[:space:]]\+$current/versionCode $next/" "$GRADLE" > "$GRADLE.tmp" && mv "$GRADLE.tmp" "$GRADLE"

echo "▶ versionCode: $current → $next"
