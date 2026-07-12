#!/usr/bin/env bash
# Copyright 2026 Elian Schock, Jonas Schwenk
# ── OS-Härtung MasterMind (Ubuntu 24.04) — idempotent ──────────────────────
#
# Installiert & aktiviert: unattended-upgrades (Auto-Security-Patches), auditd
# (Datei-Audit für sensible Dateien), und spielt sysctl-/SSH-Härtung ein.
#
# WARUM: Ungepatchte Systeme sind das häufigste Einfallstor. auditd macht
# Manipulationen an Secrets/Configs nachvollziehbar (Forensik nach einem Breach).
#
# Nutzung:  sudo bash scripts/harden-os.sh
# Mehrfach ausführbar — überschreibt Configs deterministisch.
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Bitte mit sudo/root." >&2; exit 1; fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Pakete installieren…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq unattended-upgrades auditd audispd-plugins >/dev/null

echo "==> Automatische Security-Updates aktivieren…"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
# Nur Security-Updates automatisch, automatischer Reboot nachts wenn nötig
cat > /etc/apt/apt.conf.d/51unattended-security <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF

echo "==> sysctl-Härtung einspielen…"
install -m 0644 "$REPO_DIR/ops/sysctl/99-hardening.conf" /etc/sysctl.d/99-hardening.conf
sysctl --system >/dev/null

echo "==> SSH-Härtung wird hier NICHT eingespielt (Lockout-Gefahr)."
echo "   → SSH separat und bewusst härten: siehe docs/security/ssh-setup.md"
echo "   (erst Key einrichten + testen, DANN Passwort-Login abschalten)"

echo "==> auditd-Regeln für sensible Dateien…"
cat > /etc/audit/rules.d/mastermind.rules <<EOF
# Überwache Änderungen an Secrets & sicherheitsrelevanten Configs
-w $REPO_DIR/.env.production -p wa -k mm_secrets
-w /etc/ssh/sshd_config -p wa -k sshd_config
-w /etc/ssh/sshd_config.d/ -p wa -k sshd_config
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
EOF
augenrules --load 2>/dev/null || auditctl -R /etc/audit/rules.d/mastermind.rules 2>/dev/null || true
systemctl enable --now auditd >/dev/null 2>&1 || true

echo "✓ OS-Härtung fertig."
echo "  Nächste Schritte:"
echo "   1. SSH-Config prüfen + sshd neu starten (siehe oben)."
echo "   2. sudo bash scripts/ufw-cloudflare.sh   (Firewall auf Cloudflare beschränken)"
