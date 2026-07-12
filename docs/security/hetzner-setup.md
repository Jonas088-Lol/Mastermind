<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# Hetzner-Server einrichten — MasterMind

Komplette Ersteinrichtung eines **Hetzner Cloud / Dedicated Root Servers**
(Ubuntu 24.04). Für einen echten *Managed Server ohne Root* gilt das NICHT —
dann macht Hetzner OS & Backups, und Docker/ufw/systemd sind nicht verfügbar.

Reihenfolge ist bewusst so gewählt, dass du dich nicht aussperrst.

## 0. Server bestellen & DNS

- Hetzner Cloud: CX/CPX-Instanz (Docker braucht Root — CX22+ empfohlen für
  euren Stack). Ubuntu 24.04 als Image.
- Beim Erstellen **direkt deinen SSH-Key hinterlegen** (Hetzner-Panel →
  „SSH Keys") — dann ist Passwort-Login von Anfang an aus. Das erspart die
  heikle SSH-Key-Nachrüstung.
- DNS: In Cloudflare den A-Record der Domain auf die neue Server-IP zeigen
  lassen (orange cloud / proxied = an).

## 1. Grund-Setup (Docker, Repo, Firewall-Basis)

Als root auf dem neuen Server:
```bash
# Repo klonen (das mitgelieferte Skript installiert Docker + Grundtools)
apt-get update && apt-get install -y git
git clone https://github.com/Jonas088-Lol/Mastermind.git /opt/mastermind
cd /opt/mastermind
bash scripts/setup-vps.sh DEINE-DOMAIN.de admin@DEINE-DOMAIN.de \
    https://github.com/Jonas088-Lol/Mastermind.git
```

## 2. Secrets eintragen

```bash
# .env.production vom alten Server kopieren ODER neu befüllen:
nano /opt/mastermind/.env.production
```
Pflicht: `SESSION_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GATE_PASS`,
`FIELD_ENCRYPTION_KEYS`, `DOMAIN`, `NEXT_PUBLIC_APP_URL`. (Siehe `.env.example`.)
⚠ `FIELD_ENCRYPTION_KEYS` MUSS derselbe Key wie auf dem alten Server sein,
sonst sind bestehende verschlüsselte Felder unlesbar.

## 3. OS-Härtung (sysctl, Auto-Updates, auditd)

```bash
cd /opt/mastermind
sudo APP_DIR=/opt/mastermind bash scripts/harden-os.sh
```

## 4. Firewall (SSH offen, 80/443 nur Cloudflare)

```bash
sudo bash scripts/ufw-cloudflare.sh
# Timer für wöchentliche CF-Range-Aktualisierung:
sudo cp ops/systemd/ufw-cloudflare.service /etc/systemd/system/
sudo cp ops/systemd/ufw-cloudflare.timer   /etc/systemd/system/
sudo sed -i 's|/root/Mastermind|/opt/mastermind|g' /etc/systemd/system/ufw-cloudflare.service
sudo systemctl daemon-reload && sudo systemctl enable --now ufw-cloudflare.timer
```
Danach in zweitem Terminal testen, dass SSH noch geht.

## 5. Fail2ban

```bash
sudo APP_DIR=/opt/mastermind bash scripts/setup-fail2ban.sh
# Deine Admin-IP in /etc/fail2ban/jail.local unter ignoreip eintragen.
```

## 6. Datenbank migrieren (Daten vom alten Server holen)

Auf dem **alten** Server ein verschlüsseltes Backup ziehen und auf den neuen
kopieren (oder frisch aufsetzen, falls Testdaten egal sind):
```bash
# alt: Backup erstellen
sudo APP_DIR=/root/Mastermind bash scripts/backup-db.sh
# Backup-Datei auf den neuen Server kopieren (scp), dann dort restoren:
#   age -d -i <private-key> backup.sql.gz.age | gunzip | \
#     docker compose exec -T db psql -U mastermind -d mastermind
```

## 7. App starten

```bash
cd /opt/mastermind
sudo bash scripts/nginx-cloudflare-realip.sh /opt/mastermind/nginx/cloudflare-realip.conf
docker compose --env-file .env.production up -d
docker compose --env-file .env.production exec nginx nginx -t
```

## 8. Verschlüsselte Backups + täglicher 03:00-Timer

```bash
sudo APP_DIR=/opt/mastermind bash scripts/setup-backups.sh
# ⚠ Danach den age-PRIVATE-Key sichern (Passwortmanager!):
cat /root/.config/mastermind/backup-age.key
```

## 9. Verifizieren

```bash
bash scripts/security-verify.sh DEINE-DOMAIN.de
docker compose --env-file .env.production ps
systemctl list-timers | grep mastermind
```

## Offene, bewusste Extra-Schritte (später)
- SSH-Passwort ganz abschalten: `docs/security/ssh-setup.md` (falls Key nicht
  schon beim Server-Erstellen hinterlegt wurde).
- ModSecurity-WAF scharf schalten: `docs/security/waf-tuning.md`.

---

## 10. Umschalt-Tag (Go-Live-Checkliste mit minimaler Ausfallzeit)

Reihenfolge für den eigentlichen Wechsel alt → Hetzner, ohne Datenverlust:

**Vorab (Tage vorher)**
- [ ] Neuer Server läuft komplett (Schritte 1–9), App unter der Hetzner-IP
      erreichbar (per `/etc/hosts`-Test oder Test-Subdomain prüfen).
- [ ] DNS-TTL der Domain auf **300 s (5 Min)** senken – damit die spätere
      Umstellung schnell greift.
- [ ] Ein voller Testlauf der Migration (Backup einspielen, einloggen,
      Kernfunktionen klicken) auf dem neuen Server.

**Am Umschalt-Tag**
1. [ ] **Wartungsmodus alt an:** `MAINTENANCE_MODE=true` auf dem alten Server
       → verhindert neue Schreibzugriffe während der Übernahme.
2. [ ] **Finales Backup** auf dem alten Server erstellen (`scripts/backup-db.sh`).
3. [ ] Backup auf Hetzner kopieren und einspielen (Abschnitt 6).
4. [ ] Kurzer Rauchtest auf Hetzner: Login, eine Note/Hausaufgabe sichtbar,
       Datei-Upload, Push-Registrierung.
5. [ ] **DNS umstellen:** A-/AAAA-Record (bzw. Cloudflare-Origin) auf die
       Hetzner-IP zeigen lassen. Bei Cloudflare bleibt Proxy „orange".
6. [ ] Warten bis DNS greift (wegen TTL 300 s meist < 5 Min), dann über die
       echte Domain testen.
7. [ ] **Wartungsmodus neu aus:** `MAINTENANCE_MODE=false` auf Hetzner.
8. [ ] `bash scripts/security-verify.sh DEINE-DOMAIN.de` gegen die Live-Domain.
9. [ ] Backup-Timer und Cron-Jobs laufen (`systemctl list-timers | grep mastermind`).

**Rollback (falls etwas klemmt)**
- Solange DNS noch niedrig steht: A-Record zurück auf den alten Server,
  `MAINTENANCE_MODE=false` alt. Da der alte Stand seit dem finalen Backup
  eingefroren war (Wartungsmodus), gehen keine Daten verloren.

**Nachlauf (1–2 Wochen)**
- [ ] Alten Server erst abschalten, wenn Hetzner stabil läuft und mind. ein
      erfolgreiches verschlüsseltes Backup dort erstellt wurde.
- [ ] DNS-TTL wieder erhöhen (z. B. 3600 s).
- [ ] `CAPACITOR_APP_URL` der App bleibt gleich (zeigt auf die Domain, nicht die
      IP) → **die veröffentlichte App muss NICHT neu gebaut werden.**
