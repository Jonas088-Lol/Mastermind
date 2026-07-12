<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# Self-Hosting via Cloudflare Tunnel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Mastermind Next.js-App dauerhaft auf dem eigenen PC hosten und über eine eigene Domain (Porkbun) öffentlich erreichbar machen.

**Architecture:** Next.js Production Build läuft auf localhost:3000, PM2 hält den Prozess am Leben, cloudflared verbindet die Domain per Tunnel ohne Router-Zugriff.

**Tech Stack:** Next.js 16, PM2, cloudflared, Cloudflare DNS, SQLite (lokal)

---

## Task 1: Cloudflare Account + Domain einrichten

> Manuelle Schritte im Browser — kein Code.

**Files:** keine

- [ ] **Schritt 1: Cloudflare-Account erstellen**

  Gehe zu https://dash.cloudflare.com/sign-up und erstelle einen kostenlosen Account.

- [ ] **Schritt 2: Domain zu Cloudflare hinzufügen**

  Im Cloudflare-Dashboard:
  1. Klick auf **"Add a domain"**
  2. Deine Domain eingeben (z.B. `mastermind.de`)
  3. Plan **Free** wählen
  4. Cloudflare scannt bestehende DNS-Einträge — auf **"Continue"** klicken

- [ ] **Schritt 3: Nameserver bei Porkbun umstellen**

  Cloudflare zeigt dir zwei Nameserver, z.B.:
  ```
  elsa.ns.cloudflare.com
  miles.ns.cloudflare.com
  ```
  Gehe zu https://porkbun.com → deine Domain → **Nameservers** → Custom Nameservers → beide Cloudflare-Nameserver eintragen → speichern.

  > Propagation dauert 1–24 Stunden. Du kannst in der Zwischenzeit weitermachen und am Ende testen.

- [ ] **Schritt 4: Im Cloudflare-Dashboard warten bis Domain aktiv ist**

  Status wechselt von "Pending" zu "Active". Du bekommst eine E-Mail.

---

## Task 2: Umgebungsvariablen konfigurieren

**Files:**
- Create: `/home/jonass/Development/mastermind/.env.production.local`

- [ ] **Schritt 1: VAPID-Keys generieren (für Push-Benachrichtigungen)**

  ```bash
  cd /home/jonass/Development/mastermind
  npx web-push generate-vapid-keys
  ```

  Output sieht so aus:
  ```
  Public Key: BEx...
  Private Key: abc...
  ```
  Diese Werte brauchst du gleich.

- [ ] **Schritt 2: SESSION_SECRET generieren**

  ```bash
  openssl rand -base64 48
  ```

  Den Output (eine lange Zeichenkette) notieren.

- [ ] **Schritt 3: .env.production.local erstellen**

  Datei anlegen unter `/home/jonass/Development/mastermind/.env.production.local`:

  ```env
  # ── Datenbank ─────────────────────────────────────────────
  DATABASE_URL=file:/home/jonass/Development/mastermind/prisma/prod.db

  # ── Auth ──────────────────────────────────────────────────
  SESSION_SECRET=<dein generierter Wert aus Schritt 2>

  # ── App-URL ───────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL=https://<deine-domain.de>

  # ── KI (Anthropic) ────────────────────────────────────────
  ANTHROPIC_API_KEY=<dein Anthropic API Key>

  # ── E-Mail (Resend) ───────────────────────────────────────
  RESEND_API_KEY=<dein Resend API Key>
  EMAIL_FROM=MasterMind <noreply@<deine-domain.de>>

  # ── Push (VAPID) ──────────────────────────────────────────
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=<Public Key aus Schritt 1>
  VAPID_PRIVATE_KEY=<Private Key aus Schritt 1>
  VAPID_EMAIL=mailto:admin@<deine-domain.de>

  # ── Rate-Limiting (Upstash) ───────────────────────────────
  UPSTASH_REDIS_REST_URL=<deine Upstash URL>
  UPSTASH_REDIS_REST_TOKEN=<dein Upstash Token>

  # ── Stripe ────────────────────────────────────────────────
  STRIPE_SECRET_KEY=<dein Stripe Secret Key>
  STRIPE_WEBHOOK_SECRET=<dein Stripe Webhook Secret>
  NEXT_PUBLIC_STRIPE_ENABLED=true
  ```

  > Wenn du Stripe noch nicht eingerichtet hast, setze `NEXT_PUBLIC_STRIPE_ENABLED=false` und lasse die Stripe-Keys leer.

- [ ] **Schritt 4: Prüfen dass die Datei git-ignoriert wird**

  ```bash
  cat /home/jonass/Development/mastermind/.gitignore | grep "production.local"
  ```

  Erwartete Ausgabe: `.env*.local` oder `*.local` — wenn leer, dann manuell prüfen ob `.gitignore` die Datei ausschließt.

---

## Task 3: Datenbank vorbereiten

**Files:**
- `prisma/prod.db` (wird neu erstellt)

- [ ] **Schritt 1: Prisma-Migrationen auf prod.db ausführen**

  ```bash
  cd /home/jonass/Development/mastermind
  DATABASE_URL=file:/home/jonass/Development/mastermind/prisma/prod.db npx prisma migrate deploy
  ```

  Erwartete Ausgabe:
  ```
  Applying migration `...`
  All migrations have been applied
  ```

- [ ] **Schritt 2: Seed-Daten einspielen (optional)**

  ```bash
  DATABASE_URL=file:/home/jonass/Development/mastermind/prisma/prod.db npx tsx prisma/seed.ts
  ```

---

## Task 4: App bauen

**Files:** keine neuen — Build-Output landet in `.next/`

- [ ] **Schritt 1: Production Build erstellen**

  ```bash
  cd /home/jonass/Development/mastermind
  npm run build
  ```

  Erwartete Ausgabe am Ende:
  ```
  ✓ Compiled successfully
  Route (app) ...
  ```

  Bei Fehler: Fehlermeldung lesen und TypeScript-Fehler beheben.

- [ ] **Schritt 2: Build lokal testen**

  ```bash
  npm start
  ```

  Browser öffnen: http://localhost:3000 — App muss laufen.
  Mit `Ctrl+C` wieder beenden.

---

## Task 5: App mit PM2 starten

**Files:**
- Create: `/home/jonass/Development/mastermind/ecosystem.config.js`

- [ ] **Schritt 1: PM2 Ecosystem-Datei erstellen**

  Datei `/home/jonass/Development/mastermind/ecosystem.config.js`:

  ```js
  module.exports = {
    apps: [
      {
        name: "mastermind",
        script: "node_modules/.bin/next",
        args: "start",
        cwd: "/home/jonass/Development/mastermind",
        env_file: "/home/jonass/Development/mastermind/.env.production.local",
        env: {
          NODE_ENV: "production",
          PORT: 3000,
        },
        restart_delay: 3000,
        max_restarts: 10,
      },
    ],
  };
  ```

- [ ] **Schritt 2: App mit PM2 starten**

  ```bash
  cd /home/jonass/Development/mastermind
  pm2 start ecosystem.config.js
  ```

  Erwartete Ausgabe:
  ```
  [PM2] Starting ...
  ┌─────┬──────────────┬─────────┬──────┬───────────┬──────────┬──────────┐
  │ id  │ name         │ ...     │ ↺    │ status    │ cpu      │ mem      │
  ├─────┼──────────────┼─────────┼──────┼───────────┼──────────┼──────────┤
  │ 0   │ mastermind   │ ...     │ 0    │ online    │ 0%       │ ...      │
  └─────┴──────────────┴─────────┴──────┴───────────┴──────────┴──────────┘
  ```

- [ ] **Schritt 3: Logs prüfen**

  ```bash
  pm2 logs mastermind --lines 20
  ```

  Erwartete Ausgabe: `✓ Ready on http://localhost:3000`
  Bei Fehler: Logs lesen, meist fehlt ein Env-Var.

- [ ] **Schritt 4: PM2 Autostart einrichten**

  ```bash
  pm2 startup
  ```

  Der Befehl gibt einen `sudo env ...` Befehl aus — diesen genau so kopieren und ausführen. Dann:

  ```bash
  pm2 save
  ```

---

## Task 6: Cloudflare Tunnel einrichten

> Voraussetzung: `cloudflared` ist bereits installiert.

- [ ] **Schritt 1: Bei Cloudflare einloggen**

  ```bash
  cloudflared tunnel login
  ```

  Ein Browser-Fenster öffnet sich — mit deinem Cloudflare-Account einloggen und die Domain autorisieren.

- [ ] **Schritt 2: Tunnel erstellen**

  ```bash
  cloudflared tunnel create mastermind
  ```

  Erwartete Ausgabe:
  ```
  Tunnel credentials written to /home/jonass/.cloudflared/<UUID>.json
  Created tunnel mastermind with id <UUID>
  ```

  Die `<UUID>` notieren.

- [ ] **Schritt 3: Tunnel-Konfigurationsdatei erstellen**

  Datei `/home/jonass/.cloudflared/config.yml` erstellen:

  ```yaml
  tunnel: <UUID aus Schritt 2>
  credentials-file: /home/jonass/.cloudflared/<UUID aus Schritt 2>.json

  ingress:
    - hostname: <deine-domain.de>
      service: http://localhost:3000
    - hostname: www.<deine-domain.de>
      service: http://localhost:3000
    - service: http_status:404
  ```

  > Ersetze `<deine-domain.de>` durch deine echte Domain.

- [ ] **Schritt 4: DNS-Eintrag in Cloudflare erstellen**

  ```bash
  cloudflared tunnel route dns mastermind <deine-domain.de>
  cloudflared tunnel route dns mastermind www.<deine-domain.de>
  ```

  Erwartete Ausgabe:
  ```
  Added CNAME <deine-domain.de> which will route to this tunnel
  ```

- [ ] **Schritt 5: Tunnel testen**

  ```bash
  cloudflared tunnel run mastermind
  ```

  Browser öffnen: `https://<deine-domain.de>` — App muss erreichbar sein.
  Mit `Ctrl+C` beenden (läuft gleich als Service weiter).

---

## Task 7: Cloudflare Tunnel als Systemd-Service einrichten

> Damit der Tunnel nach einem PC-Neustart automatisch startet.

- [ ] **Schritt 1: Service installieren**

  ```bash
  sudo cloudflared service install
  ```

  Erwartete Ausgabe:
  ```
  [cloudflared] INFO ... service installed successfully
  ```

- [ ] **Schritt 2: Service starten**

  ```bash
  sudo systemctl start cloudflared
  sudo systemctl enable cloudflared
  ```

- [ ] **Schritt 3: Service-Status prüfen**

  ```bash
  sudo systemctl status cloudflared
  ```

  Erwartete Ausgabe: `Active: active (running)`

---

## Task 8: End-to-End verifizieren

- [ ] **Schritt 1: PM2-Status prüfen**

  ```bash
  pm2 list
  ```

  Erwartete Ausgabe: `mastermind` mit Status `online`

- [ ] **Schritt 2: Tunnel-Status prüfen**

  ```bash
  sudo systemctl status cloudflared
  ```

  Erwartete Ausgabe: `active (running)`

- [ ] **Schritt 3: App im Browser aufrufen**

  Öffne `https://<deine-domain.de>` — HTTPS-Schloss muss grün sein, App muss laden.

- [ ] **Schritt 4: PC neu starten und erneut prüfen**

  ```bash
  sudo reboot
  ```

  Nach dem Neustart: `https://<deine-domain.de>` im Browser aufrufen — alles muss ohne manuellen Eingriff laufen.

---

## Nützliche Befehle (für später)

```bash
# App-Logs live ansehen
pm2 logs mastermind

# App neu starten (z.B. nach Code-Änderungen)
npm run build && pm2 restart mastermind

# Tunnel-Logs
sudo journalctl -u cloudflared -f

# PM2-Status
pm2 list
```
