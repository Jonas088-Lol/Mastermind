# ===========================================================================
# MasterMind -- Download-Dateien auf den Server deployen
#
# Überträgt alle gebauten App-Dateien aus downloads/ auf den VPS.
# Nginx serviert sie dann direkt unter /downloads/*.
#
# Voraussetzungen:
#   - SSH-Key für den Server hinterlegt (ssh-add)
#   - SCP / SSH im PATH (Git Bash oder WSL)
#
# Verwendung:
#   .\scripts\deploy-downloads.ps1 -Server "root@123.45.67.89"
#   .\scripts\deploy-downloads.ps1  # liest DEPLOY_SERVER aus .env.production
# ===========================================================================

param(
    [string]$Server      = "",
    [string]$ServerPath  = "/srv/mastermind/downloads",
    [string]$LocalDir    = ""
)

$Root = Split-Path $PSScriptRoot

# Server aus .env.production lesen, falls nicht angegeben
if (-not $Server) {
    $envFile = "$Root\.env.production"
    if (Test-Path $envFile) {
        $line = Get-Content $envFile | Where-Object { $_ -match "^DEPLOY_SERVER=" } | Select-Object -First 1
        if ($line) { $Server = $line -replace "^DEPLOY_SERVER=", "" }
    }
}

if (-not $Server) {
    Write-Host "[FEHLER] Kein Server angegeben." -ForegroundColor Red
    Write-Host "  Verwende: .\scripts\deploy-downloads.ps1 -Server 'user@host'"
    Write-Host "  Oder: DEPLOY_SERVER=user@host in .env.production setzen"
    exit 1
}

if (-not $LocalDir) { $LocalDir = "$Root\downloads" }

if (-not (Test-Path $LocalDir)) {
    Write-Host "[FEHLER] Verzeichnis nicht gefunden: $LocalDir" -ForegroundColor Red
    Write-Host "  Führe zuerst .\scripts\build-desktop.ps1 aus"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MasterMind Download-Deploy"            -ForegroundColor Cyan
Write-Host "  Server:    $Server"                    -ForegroundColor Cyan
Write-Host "  Pfad:      $ServerPath"                -ForegroundColor Cyan
Write-Host "  Lokal:     $LocalDir"                  -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verzeichnis auf dem Server erstellen
ssh $Server "mkdir -p $ServerPath"

# Alle Dateien hochladen
$files = Get-ChildItem $LocalDir -File
Write-Host "Lade $($files.Count) Datei(en) hoch..." -ForegroundColor Yellow
Write-Host ""

foreach ($f in $files) {
    $sizeMB = [Math]::Round($f.Length / 1MB, 1)
    Write-Host "  → $($f.Name) (${sizeMB} MB)..." -NoNewline
    scp "$($f.FullName)" "${Server}:${ServerPath}/"
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host " FEHLER" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy abgeschlossen!"                  -ForegroundColor Cyan
Write-Host "  Downloads erreichbar unter:"            -ForegroundColor Cyan
Write-Host "  https://app.mastermind.app/downloads/"  -ForegroundColor Cyan
Write-Host ""
Write-Host "  Nginx neu starten falls nötig:"         -ForegroundColor Gray
Write-Host "  ssh $Server 'cd /srv/mastermind && docker compose restart nginx'" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
