<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# Phase 1 — Netzwerk- & Perimeter-Härtung

Alle Bausteine liegen als versionierte Configs/Skripte im Repo. Sie laufen NICHT
automatisch — du spielst sie kontrolliert auf dem Server ein (Reihenfolge unten).

## Reihenfolge (wichtig — nicht vertauschen)

> ⚠ **Zweite SSH-Session offen halten**, bis alles verifiziert ist. Ein Fehler
> in SSH-/Firewall-Config kann dich aussperren.

### 1. Deploy-Nutzer + SSH-Key vorbereiten
```bash
# Falls noch kein non-root Deploy-User existiert:
adduser deploy && usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
# Deinen Ed25519-Public-Key eintragen:
echo "ssh-ed25519 AAAA... dein-key" >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys && chown -R deploy:deploy /home/deploy/.ssh
```
In `ops/ssh/99-hardening.conf` `AllowUsers deploy` und ggf. `Port` anpassen.

### 2. OS-Härtung (sysctl, auto-updates, auditd, SSH-Config einspielen)
```bash
cd /root/Mastermind
sudo bash scripts/harden-os.sh
```
Danach SSH manuell testen und neu starten:
```bash
sudo sshd -t                       # Syntax-Check — muss fehlerfrei sein
sudo systemctl restart ssh
# In NEUER Session prüfen: ssh -p 2222 deploy@SERVER_IP
```

### 3. Firewall auf Cloudflare beschränken
```bash
# SSH_PORT muss zum sshd-Port passen; ADMIN_IP optional (feste Admin-IP)
sudo SSH_PORT=2222 ADMIN_IP=DEINE_IP bash scripts/ufw-cloudflare.sh
```

### 4. Wöchentliche Cloudflare-Range-Aktualisierung (systemd-Timer)
```bash
sudo cp ops/systemd/ufw-cloudflare.service /etc/systemd/system/
sudo cp ops/systemd/ufw-cloudflare.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ufw-cloudflare.timer
```

### 5. Origin-Schutz (nginx) + Cloudflare Full (Strict)
- Die nginx-Config weist jetzt direkte IP-/Fremd-Host-Zugriffe mit `444` ab
  (siehe `nginx/conf.d/mastermind.conf.template`). Container neu starten:
  ```bash
  docker compose --env-file .env.production up -d --force-recreate nginx
  ```
- In Cloudflare: **SSL/TLS → Overview → Full (Strict)** einstellen.
- **Authenticated Origin Pulls** (Cloudflare liefert Client-Cert) ist der nächste
  Schärfegrad — separat einrichten, sobald Full(Strict) stabil läuft:
  Cloudflare → SSL/TLS → Origin Server → Authenticated Origin Pulls (zone-level),
  dann in nginx `ssl_client_certificate` (CF-Origin-CA) + `ssl_verify_client on;`.
  ⚠ Erst NACH Verifikation scharfschalten, sonst sperrt es legitimen Traffic aus.

## Verifikation

| Prüfung | Befehl / Erwartung |
|---|---|
| Nur erwartete Ports offen | `nmap -Pn SERVER_IP` von extern → nur SSH-Port (falls nicht CF-only) |
| Direkter IP-Aufruf liefert kein MasterMind | `curl -k https://SERVER_IP` → leere Antwort/Reset (444) |
| SSH nur mit Key | `ssh -o PubkeyAuthentication=no deploy@…` → abgelehnt |
| kein root-SSH | `ssh root@…` → Permission denied |
| sysctl aktiv | `sysctl net.ipv4.tcp_syncookies` → `= 1` |
| Firewall CF-only | `sudo ufw status` → 80/443 nur mit Cloudflare-IPs |
| Auto-Updates | `systemctl status unattended-upgrades` → active |
| auditd | `auditctl -l | grep mm_secrets` → Regel vorhanden |
