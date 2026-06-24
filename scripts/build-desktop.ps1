# ===========================================================================
# MasterMind -- Desktop App Build Script (Windows / PowerShell)
#
# Baut Electron-Apps fuer Windows und Linux.
# macOS-Builds sind nur auf einem Mac moeglich (Code-Signing + APFS-Image).
#
# Voraussetzungen:
#   - Node.js + npm installiert
#   - electron/node_modules vorhanden (wird automatisch installiert)
#
# Verwendung:
#   .\scripts\build-desktop.ps1              # Windows + Linux
#   .\scripts\build-desktop.ps1 -Win         # nur Windows
#   .\scripts\build-desktop.ps1 -Linux       # nur Linux (ggf. Docker noetig)
# ===========================================================================

param(
    [switch]$Win,
    [switch]$Linux
)

# Standardmaessig beides bauen
if (-not $Win -and -not $Linux) { $Win = $true; $Linux = $true }

$Root        = (Split-Path $PSScriptRoot)
$ElectronDir = "$Root\electron"
$DistDir     = "$ElectronDir\dist"
$OutputDir   = "$Root\downloads"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Version aus Haupt-package.json lesen
$Version = (Get-Content "$Root\package.json" | ConvertFrom-Json).version
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MasterMind Desktop Build v$Version"    -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Electron dependencies sicherstellen
if (-not (Test-Path "$ElectronDir\node_modules")) {
    Write-Host "[...] npm install in electron/..." -ForegroundColor Yellow
    Push-Location $ElectronDir
    npm install
    Pop-Location
}

# icon.ico aus icon.png generieren (einmalig)
$IcoPath = "$ElectronDir\resources\icon.ico"
$PngPath = "$ElectronDir\resources\icon.png"
if (-not (Test-Path $IcoPath) -and (Test-Path $PngPath)) {
    Write-Host "[...] Generiere icon.ico aus icon.png..." -ForegroundColor Yellow
    node "$Root\electron\scripts\generate-icon.js"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FEHLER] Icon-Generierung fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
    Write-Host "  icon.ico erstellt" -ForegroundColor Green
}

# ── Windows ──────────────────────────────────────────────────────────────────
if ($Win) {
    Write-Host ""
    Write-Host "[Win] Baue Windows-Installer (NSIS x64/arm64 + Portable)..." -ForegroundColor Yellow
    Push-Location $ElectronDir
    npx electron-builder --win --x64 --arm64
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Host "[FEHLER] Windows-Build fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
    Pop-Location

    # Ausgabedateien in downloads/ kopieren
    foreach ($pattern in @("MasterMind-Setup-*.exe", "MasterMind-Portable*.exe")) {
        Get-ChildItem "$DistDir\$pattern" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination "$OutputDir\$($_.Name)" -Force
            $sizeMB = [Math]::Round($_.Length / 1MB, 1)
            Write-Host "  Kopiert: $($_.Name) ($sizeMB MB)" -ForegroundColor Green
        }
    }
}

# ── Linux ─────────────────────────────────────────────────────────────────────
if ($Linux) {
    Write-Host ""
    Write-Host "[Linux] Baue Linux-Pakete (AppImage x64/arm64, deb x64)..." -ForegroundColor Yellow
    Write-Host "        Hinweis: Fuer .deb wird ggf. fpm benoetigt." -ForegroundColor Gray

    Push-Location $ElectronDir
    npx electron-builder --linux
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Host "[FEHLER] Linux-Build fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
    Pop-Location

    foreach ($pattern in @("*.AppImage", "*.deb")) {
        Get-ChildItem "$DistDir\$pattern" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination "$OutputDir\$($_.Name)" -Force
            $sizeMB = [Math]::Round($_.Length / 1MB, 1)
            Write-Host "  Kopiert: $($_.Name) ($sizeMB MB)" -ForegroundColor Green
        }
    }
}

# ── versions.json aktualisieren ───────────────────────────────────────────────
Write-Host ""
Write-Host "[...] Aktualisiere versions.json..." -ForegroundColor Yellow

$releaseDate = (Get-Date).ToString("yyyy-MM-dd")

$manifest = @{
    version     = $Version
    releaseDate = $releaseDate
    note        = "Build vom $releaseDate"
}

$manifestPath = "$OutputDir\versions.json"
$manifest | ConvertTo-Json -Depth 3 | Set-Content $manifestPath -Encoding UTF8
Write-Host "  Geschrieben: $manifestPath" -ForegroundColor Green

# Auch in public/downloads/ kopieren (fuer lokale Dev-Umgebung)
$publicManifest = "$Root\public\downloads\versions.json"
$manifest | ConvertTo-Json -Depth 3 | Set-Content $publicManifest -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build abgeschlossen!"                   -ForegroundColor Cyan
Write-Host "  Ausgabe: $OutputDir"                    -ForegroundColor Cyan
Write-Host "  Naechster Schritt:"                     -ForegroundColor Cyan
Write-Host "  .\scripts\deploy-downloads.ps1"         -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
