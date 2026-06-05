# ═══════════════════════════════════════════════════════════════════════════
# MasterMind — Android Studio Setup (Windows)
# Run as Administrator: powershell -ExecutionPolicy Bypass -File scripts/install-android-studio.ps1
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  MasterMind Android Build Setup" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan

# ── Check Java ─────────────────────────────────────────────────────────────
$javaVersion = java -version 2>&1 | Select-String "version"
if ($javaVersion) {
    Write-Host "✓ Java found: $javaVersion" -ForegroundColor Green
} else {
    Write-Host "⚠ Java not found. Installing JDK 17..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install Microsoft.OpenJDK.17 --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "  Download JDK 17 from: https://adoptium.net/" -ForegroundColor Yellow
    }
}

# ── Check Android Studio ───────────────────────────────────────────────────
$androidStudioPaths = @(
    "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe",
    "C:\Program Files\Android\Android Studio\bin\studio64.exe",
    "$env:ProgramFiles\Android\Android Studio\bin\studio64.exe"
)

$studioPath = $androidStudioPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($studioPath) {
    Write-Host "✓ Android Studio found at: $studioPath" -ForegroundColor Green
} else {
    Write-Host "⚠ Android Studio not found." -ForegroundColor Yellow
    Write-Host "  Installing via winget..." -ForegroundColor Yellow

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install Google.AndroidStudio --accept-package-agreements --accept-source-agreements
        # Re-check after install
        $studioPath = $androidStudioPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    }

    if (-not $studioPath) {
        Write-Host "  Download manually: https://developer.android.com/studio" -ForegroundColor Yellow
        Write-Host "  After install, re-run this script." -ForegroundColor Yellow
    }
}

# ── Set CAPACITOR_ANDROID_STUDIO_PATH ──────────────────────────────────────
if ($studioPath) {
    $env:CAPACITOR_ANDROID_STUDIO_PATH = $studioPath

    # Persist in user environment
    [System.Environment]::SetEnvironmentVariable(
        "CAPACITOR_ANDROID_STUDIO_PATH",
        $studioPath,
        "User"
    )
    Write-Host "✓ CAPACITOR_ANDROID_STUDIO_PATH set to: $studioPath" -ForegroundColor Green

    # Also set ANDROID_HOME if SDK exists
    $sdkPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk"
    )
    $sdkPath = $sdkPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($sdkPath) {
        [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "User")
        [System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkPath, "User")
        Write-Host "✓ ANDROID_HOME set to: $sdkPath" -ForegroundColor Green
    } else {
        Write-Host "  ANDROID_HOME not set — SDK will be configured in Android Studio" -ForegroundColor Yellow
    }
}

# ── Try opening the Android project ────────────────────────────────────────
Write-Host ""
Write-Host "▶ Opening Android project in Android Studio..." -ForegroundColor Cyan

Set-Location (Split-Path -Parent $PSScriptRoot)
$env:CAPACITOR_ANDROID_STUDIO_PATH = $studioPath

npx cap open android

Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Next steps in Android Studio:" -ForegroundColor Cyan
Write-Host "  1. Wait for Gradle sync to complete" -ForegroundColor White
Write-Host "  2. Build > Generate Signed Bundle / APK" -ForegroundColor White
Write-Host "  3. Choose 'Android App Bundle' for Play Store" -ForegroundColor White
Write-Host "  4. Follow the signing wizard" -ForegroundColor White
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
