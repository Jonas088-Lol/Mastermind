# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — APK Build Script (Windows / PowerShell)
#
# Voraussetzungen:
#   - Android Studio oder Android SDK installiert
#   - ANDROID_HOME Umgebungsvariable gesetzt
#   - Java 17+ (JDK) installiert
#   - Node.js + npm installiert
#
# Verwendung:
#   .\scripts\build-apk.ps1                         # Debug-APK
#   .\scripts\build-apk.ps1 -BuildType release      # Release-APK (unsigned)
#   .\scripts\build-apk.ps1 -AppUrl https://meineschule.de
#
# Output: android\app\build\outputs\apk\{debug|release}\app-{debug|release}.apk
# ═══════════════════════════════════════════════════════════════════════════

param(
    [ValidateSet("debug", "release")]
    [string]$BuildType = "debug",
    [string]$AppUrl = $env:CAPACITOR_APP_URL
)

if (-not $AppUrl) { $AppUrl = "https://app.mastermind.app" }

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  MasterMind APK Builder (Windows)                ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Build-Typ:  $BuildType" -ForegroundColor Cyan
Write-Host "║  Server URL: $AppUrl" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Prüfe Voraussetzungen ──────────────────────────────────────────────────
if (-not (Test-Path "android")) {
    Write-Host "✗ Android-Verzeichnis nicht gefunden." -ForegroundColor Red
    Write-Host "  Führe zuerst aus: npx cap add android"
    exit 1
}

# ANDROID_HOME suchen
$androidHome = $env:ANDROID_HOME
if (-not $androidHome) {
    $candidates = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:ProgramFiles\Android\Android Studio\sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $androidHome = $c; break }
    }
}
if (-not $androidHome) {
    Write-Host "✗ ANDROID_HOME nicht gefunden." -ForegroundColor Red
    Write-Host "  Setze: `$env:ANDROID_HOME = 'C:\Users\...\AppData\Local\Android\Sdk'"
    exit 1
}
$env:ANDROID_HOME = $androidHome
Write-Host "✓ Android SDK: $androidHome"

# ── Capacitor Sync ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Synchronisiere Capacitor (Server: $AppUrl)..." -ForegroundColor Yellow
$env:CAPACITOR_APP_URL = $AppUrl
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Capacitor sync fehlgeschlagen" -ForegroundColor Red; exit 1 }
Write-Host "✓ Sync abgeschlossen" -ForegroundColor Green

# ── Gradle Build ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Baue $BuildType APK..." -ForegroundColor Yellow

$env:GRADLE_OPTS = "-Xmx2g -XX:MaxMetaspaceSize=512m"

Push-Location android

if ($BuildType -eq "release") {
    .\gradlew.bat assembleRelease --quiet
    $apkRelativePath = "app\build\outputs\apk\release\app-release-unsigned.apk"
} else {
    .\gradlew.bat assembleDebug --quiet
    $apkRelativePath = "app\build\outputs\apk\debug\app-debug.apk"
}

if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Host "✗ Gradle Build fehlgeschlagen" -ForegroundColor Red
    exit 1
}

Pop-Location

# ── Ergebnis ──────────────────────────────────────────────────────────────
$fullPath = "android\$apkRelativePath"
if (Test-Path $fullPath) {
    $size = [math]::Round((Get-Item $fullPath).Length / 1MB, 1)
    $outputName = "mastermind-$BuildType.apk"
    Copy-Item $fullPath -Destination $outputName -Force

    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ APK erfolgreich erstellt!                     ║" -ForegroundColor Green
    Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║  Datei:  $fullPath" -ForegroundColor Green
    Write-Host "║  Größe:  ${size} MB" -ForegroundColor Green
    Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║  Auch kopiert nach: .\$outputName" -ForegroundColor Green
    Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║  Installation (USB-Debugging):                   ║" -ForegroundColor Green
    Write-Host "║  adb install $fullPath" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "✗ APK nicht gefunden: $fullPath" -ForegroundColor Red
    exit 1
}
