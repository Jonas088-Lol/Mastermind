<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# SSH-Key einrichten & härten (Windows → root, aktuell Passwort-Login)

Ablauf so, dass du dich NICHT aussperren kannst. **Halte während der ganzen
Prozedur deine bestehende SSH-Session offen** — schließe sie erst, wenn ein
zweiter Login per Key nachweislich funktioniert.

## Schritt 1 — Key auf deinem Windows-PC erzeugen (PowerShell)

```powershell
ssh-keygen -t ed25519 -C "mastermind-admin"
# Enter für Standardpfad (C:\Users\jonas\.ssh\id_ed25519), Passphrase optional
```

## Schritt 2 — Public-Key auf den Server bringen

```powershell
# Zeigt deinen Public-Key an:
type $env:USERPROFILE\.ssh\id_ed25519.pub
```
Diesen Key auf dem **Server** (in deiner offenen root-Session) eintragen:
```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA...DEIN_KEY... mastermind-admin" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Schritt 3 — Key testen (NEUES Terminal, alte Session offen lassen!)

```powershell
ssh root@SERVER_IP
```
Wenn du **ohne Passwort-Eingabe** reinkommst → Key funktioniert. ✅
Wenn nicht → Schritt 2 prüfen, NICHT weitermachen.

## Schritt 4 — Erst JETZT Passwort-Login abschalten

Auf dem Server (in der funktionierenden Session):
```bash
cd /root/Mastermind
cp ops/ssh/99-hardening.conf /etc/ssh/sshd_config.d/99-hardening.conf
sshd -t          # Syntax-Check — MUSS fehlerfrei sein
systemctl restart ssh
```

## Schritt 5 — Verifizieren

```powershell
# Neues Terminal: muss weiter per Key gehen
ssh root@SERVER_IP
# Passwort-Login muss jetzt ABGELEHNT werden:
ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password root@SERVER_IP
# → "Permission denied" = korrekt gehärtet
```

Wenn Schritt 5 klappt, ist SSH sicher. Falls irgendetwas schiefgeht und du
ausgesperrt bist: ZAP-Hosting bietet i.d.R. eine **VNC/Rescue-Konsole** im
Kundenpanel — darüber kommst du auch ohne SSH auf den Server.
