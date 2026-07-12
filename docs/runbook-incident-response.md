<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# Runbook — Incident Response (MasterMind)

Handlungsleitfaden bei einem Sicherheitsvorfall / Datenschutzverstoß.
Ziel: schnell, nachvollziehbar, DSGVO-konform reagieren. Bei Verdacht **ruhig
und der Reihe nach** — nicht überstürzt Systeme zerstören (Beweise sichern).

> ⚖️ Die 72-Stunden-Meldepflicht (Art. 33 DSGVO) ist eine rechtliche Frist.
> Im Zweifel früh eine datenschutzkundige Person / Anwalt einbeziehen.

## 0. Kontakte (vorab ausfüllen)

- Security-Verantwortlich: Jonas Schwenk — jonas.schwenk187@gmail.com
- Hosting (ZAP-Hosting): ______
- Zuständige Aufsichtsbehörde (DE, je nach Bundesland): ______
- Datenschutzbeauftragte/r (falls bestellt): ______

## 1. Erkennen & Einstufen (Triage)

Woran erkennt man einen Vorfall?
- Fail2ban/WAF-Alert-Spikes, ungewöhnliche 5xx-Raten, unbekannte Admin-Logins,
  Kostenspike Anthropic, Meldung von außen.

Fragen:
- Was ist betroffen (App, DB, Server, einzelner Account)?
- Sind **personenbezogene Daten** betroffen? (→ Meldepflicht prüfen)
- Läuft der Angriff noch (aktiv) oder ist er vorbei?

## 2. Eindämmen (Containment)

**Beweise zuerst sichern, dann eindämmen.**
- Verdächtige IPs sofort bannen: `sudo fail2ban-client set <jail> banip <IP>`
  oder in Cloudflare als WAF-Block.
- Bei kompromittiertem Account: Sessions killen (DB: betroffene `Session`-Zeilen
  löschen) + Passwort-Reset erzwingen.
- Bei kompromittiertem Secret (Key-Leak): **rotieren** (nicht nur entfernen) —
  `SESSION_SECRET`, `FIELD_ENCRYPTION_KEYS`, DB-/Redis-Passwort, API-Keys.
  Nach `SESSION_SECRET`-Rotation sind alle Nutzer ausgeloggt (gewollt).
- Bei Server-Kompromittierung: Netzwerk isolieren (ufw alles dicht außer deiner
  Admin-IP), aber Server **nicht** sofort neu aufsetzen (Forensik).

## 3. Analysieren

- Logs sichten: `docker compose logs app`, `/var/log/nginx/`, `auditctl`,
  `/var/log/modsec_audit.log`, `journalctl -u ssh`.
- Umfang bestimmen: Welche Daten, wie viele Betroffene, welcher Zeitraum?
- Einfallstor finden (damit der Fix nicht nur Symptom behandelt).

## 4. Melden (falls personenbezogene Daten betroffen)

**Innerhalb 72 h ab Kenntnis** (Art. 33):
- Meldung an die zuständige Aufsichtsbehörde mit: Art des Vorfalls, betroffene
  Datenkategorien, ungefähre Zahl Betroffener, Folgen, ergriffene Maßnahmen.
- **Betroffene informieren** (Art. 34), wenn hohes Risiko (z. B. Klarname +
  Zugangsdaten geleakt).
- Alles dokumentieren (Zeitleiste, Entscheidungen) — auch für die eigene
  Nachweispflicht.

## 5. Beheben & Wiederherstellen

- Root Cause fixen (Patch, Config, Rotation).
- Bei Datenverlust: Restore aus verschlüsseltem Backup
  (`scripts/restore-test.sh` zeigt den Ablauf; Prod-Restore analog).
- Systeme kontrolliert wieder öffnen, Monitoring verschärfen.

## 6. Post-Mortem

- Was ist passiert, warum, wie schnell erkannt/reagiert?
- Welche Maßnahme verhindert die Wiederholung? (→ als Task umsetzen)
- Runbook aktualisieren mit den Learnings.

## Schnell-Referenz (Copy-Paste)

```bash
# Alle Sessions eines Users killen (DB)
docker compose exec db psql -U mastermind -d mastermind \
  -c "DELETE FROM \"Session\" WHERE \"userId\"='<id>';"

# IP sofort bannen
sudo fail2ban-client set sshd banip <IP>

# Firewall auf Notfall-Modus (nur Admin-IP)
sudo ufw default deny incoming && sudo ufw allow from <ADMIN_IP>

# WAF scharf schalten (falls noch DetectionOnly)
# in nginx/modsec/main.conf: SecRuleEngine On → nginx reload
```
