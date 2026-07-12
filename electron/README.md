<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# MasterMind Desktop App

Electron-based desktop wrapper — loads all content from `https://app.mastermind.app`.

## Voraussetzungen

- Node.js ≥ 22
- npm ≥ 10

## Entwicklung

```bash
# Dependencies installieren
npm run desktop:install

# App lokal starten (öffnet Fenster mit Produktionsserver)
npm run desktop:start
```

## Builds

```bash
# Windows (.exe Installer)
npm run desktop:build:win

# macOS (.dmg)
npm run desktop:build:mac

# Linux (.AppImage)
npm run desktop:build:linux

# Alle Plattformen gleichzeitig
npm run desktop:build:all
```

> **Hinweis:** macOS-Builds müssen auf einem Mac erstellt werden.
> Nutze den GitHub Actions Workflow `.github/workflows/build-desktop.yml` für Cross-Platform-Builds.

## Icons

Lege die App-Icons unter `electron/resources/` ab:

| Datei | Plattform | Größe |
|-------|-----------|-------|
| `icon.ico` | Windows | 256×256 (multi-res ICO) |
| `icon.icns` | macOS | ICNS (enthält 512×512) |
| `icon.png` | Linux / Tray | 512×512 PNG |

Das Logo (`public/brand/logo.png`) kann als Basis genutzt werden —
konvertiere es mit einem Tool wie ImageMagick oder https://cloudconvert.com.

## Architektur

```
Electron BrowserWindow
    └── lädt https://app.mastermind.app
            └── Next.js App (Server)
```

Kein lokales App-Bundle. Alle Updates sind sofort wirksam sobald der
Server deployed wird. Die Desktop-App ist nur ein „Fenster" auf die Web-App.
