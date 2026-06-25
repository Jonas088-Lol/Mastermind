# ===========================================================================
# MasterMind -- APK Build Script (Windows / PowerShell)
#
# Voraussetzungen:
#   - Android Studio oder Android SDK installiert
#   - ANDROID_HOME Umgebungsvariable gesetzt (oder Standard-Pfad)
#   - Java 17+ (JDK) installiert
#   - Node.js + npm installiert
#
# Verwendung:
#   .\scripts\build-apk.ps1                         # Debug-APK
#   .\scripts\build-apk.ps1 -BuildType release      # Release-APK (signiert)
#   .\scripts\build-apk.ps1 -AppUrl https://meineschule.de
# ===========================================================================

param(
    [ValidateSet("debug", "release")]
    [string]$BuildType = "debug",
    [string]$AppUrl = $env:CAPACITOR_APP_URL
)

if (-not $AppUrl) { $AppUrl = "https://konvertis.de" }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  MasterMind APK Builder (Windows)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Build-Typ:  $BuildType" -ForegroundColor Cyan
Write-Host "  Server URL: $AppUrl" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# -- Pruefe Voraussetzungen --------------------------------------------------
if (-not (Test-Path "android")) {
    Write-Host "[FEHLER] Android-Verzeichnis nicht gefunden." -ForegroundColor Red
    Write-Host "  Fuehre zuerst aus: npx cap add android"
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
    Write-Host "[FEHLER] ANDROID_HOME nicht gefunden." -ForegroundColor Red
    Write-Host "  Setze: `$env:ANDROID_HOME = 'C:\Users\...\AppData\Local\Android\Sdk'"
    exit 1
}
$env:ANDROID_HOME = $androidHome
Write-Host "[OK] Android SDK: $androidHome" -ForegroundColor Green

# -- Keystore fuer Release-Build generieren ----------------------------------
if ($BuildType -eq "release") {
    $keystorePath = "android\mastermind.keystore"
    $keystorePropsPath = "android\keystore.properties"

    if (-not (Test-Path $keystorePath)) {
        Write-Host ""
        Write-Host "[...] Generiere Signatur-Keystore (einmalig)..." -ForegroundColor Yellow

        # keytool aus dem JDK finden
        $keytool = (Get-Command keytool -ErrorAction SilentlyContinue)?.Source
        if (-not $keytool) {
            # Android Studio JDK Fallback
            $jbrPath = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
            if (Test-Path $jbrPath) { $keytool = $jbrPath }
        }
        if (-not $keytool) {
            Write-Host "[FEHLER] keytool nicht gefunden. Java JDK installiert?" -ForegroundColor Red
            exit 1
        }

        & $keytool -genkey -v `
            -keystore $keystorePath `
            -alias mastermind `
            -keyalg RSA -keysize 2048 -validity 10000 `
            -storepass mastermind2024 `
            -keypass mastermind2024 `
            -dname "CN=MasterMind, OU=App, O=MasterMind, L=DE, ST=DE, C=DE" `
            2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-Host "[FEHLER] Keystore-Generierung fehlgeschlagen" -ForegroundColor Red
            exit 1
        }
        Write-Host "[OK] Keystore erstellt: $keystorePath" -ForegroundColor Green
    } else {
        Write-Host "[OK] Keystore vorhanden: $keystorePath" -ForegroundColor Green
    }

    # keystore.properties fuer Gradle schreiben (Pfad relativ zu android/app/, wo build.gradle liegt)
    @"
storeFile=../mastermind.keystore
storePassword=mastermind2024
keyAlias=mastermind
keyPassword=mastermind2024
"@ | Set-Content $keystorePropsPath -Encoding UTF8
}

# -- Capacitor Sync ----------------------------------------------------------
Write-Host ""
Write-Host "[...] Synchronisiere Capacitor (Server: $AppUrl)..." -ForegroundColor Yellow
$env:CAPACITOR_APP_URL = $AppUrl
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FEHLER] Capacitor sync fehlgeschlagen" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Sync abgeschlossen" -ForegroundColor Green

# -- Gradle Build ------------------------------------------------------------
Write-Host ""
Write-Host "[...] Baue $BuildType APK..." -ForegroundColor Yellow

$env:GRADLE_OPTS = "-Xmx2g -XX:MaxMetaspaceSize=512m"

Push-Location android

if ($BuildType -eq "release") {
    .\gradlew.bat assembleRelease
    $apkRelativePath = "app\build\outputs\apk\release\app-release.apk"
} else {
    .\gradlew.bat assembleDebug
    $apkRelativePath = "app\build\outputs\apk\debug\app-debug.apk"
}

if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Host "[FEHLER] Gradle Build fehlgeschlagen" -ForegroundColor Red
    exit 1
}

Pop-Location

# -- Ergebnis ----------------------------------------------------------------
$fullPath = "android\$apkRelativePath"
if (Test-Path $fullPath) {
    $size = [math]::Round((Get-Item $fullPath).Length / 1MB, 1)

    # Sicherstellen dass downloads/ existiert
    $downloadsDir = Join-Path (Split-Path $PSScriptRoot) "downloads"
    if (-not (Test-Path $downloadsDir)) { New-Item -ItemType Directory -Path $downloadsDir | Out-Null }

    # Release APK heisst mastermind.apk, Debug bleibt mastermind-debug.apk
    if ($BuildType -eq "release") {
        $outputName = "mastermind.apk"
    } else {
        $outputName = "mastermind-debug.apk"
    }
    $outputPath = Join-Path $downloadsDir $outputName
    Copy-Item $fullPath -Destination $outputPath -Force

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  [OK] APK erfolgreich erstellt!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  Quelle:  $fullPath" -ForegroundColor Green
    Write-Host "  Groesse: ${size} MB" -ForegroundColor Green
    Write-Host "  Kopiert nach: downloads\$outputName" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  Jetzt deployen:" -ForegroundColor Green
    Write-Host "  .\scripts\deploy-downloads.ps1 -Server 'user@host'" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[FEHLER] APK nicht gefunden: $fullPath" -ForegroundColor Red
    exit 1
}
