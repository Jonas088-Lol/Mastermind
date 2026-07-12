#!/usr/bin/env bash
# Copyright 2026 Elian Schock, Jonas Schwenk
# ── Fail2ban einrichten für MasterMind (idempotent) ────────────────────────
#
# WARUM: Dynamisches IP-Banning gegen SSH-Brute-Force und HTTP-Scanning/Fuzzing.
# Ergänzt die statischen ufw-Regeln um reaktive Sperren.
#
# ⚠ VORAUSSETZUNG: nginx-Logs müssen die ECHTE Client-IP zeigen (real_ip aus
#    Phase 2). Sonst bannt Fail2ban die Cloudflare-IPs — was alle aussperrt.
#    Deshalb: erst Phase 2 (real_ip) deployen, dann Fail2ban.
#
# ⚠ Die nginx-Logs liegen im Docker-Container. Dieses Setup erwartet, dass sie
#    auf den Host gemountet sind (/var/log/nginx). Falls nicht, siehe Hinweis
#    unten — dann Fail2ban im Container-Log-Pfad konfigurieren.
#
# Nutzung:  sudo bash scripts/setup-fail2ban.sh
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Bitte mit sudo/root." >&2; exit 1; fi
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Fail2ban installieren…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq fail2ban >/dev/null

echo "==> Configs einspielen…"
install -m 0644 "$REPO_DIR/ops/fail2ban/jail.local" /etc/fail2ban/jail.local
install -m 0644 "$REPO_DIR/ops/fail2ban/filter.d/nginx-bad-request.conf" \
  /etc/fail2ban/filter.d/nginx-bad-request.conf

# Falls nginx-Logs NICHT unter /var/log/nginx liegen (Docker), die betroffenen
# HTTP-Jails deaktivieren, damit Fail2ban nicht wegen fehlender Logs fehlstartet.
if [[ ! -f /var/log/nginx/access.log ]]; then
  echo "⚠ /var/log/nginx/access.log fehlt — HTTP-Jails werden deaktiviert."
  echo "  (Mounte die nginx-Logs auf den Host, dann Jails wieder aktivieren.)"
  sed -i '/^\[nginx-limit-req\]/,/^$/ s/^enabled  = true/enabled  = false/' /etc/fail2ban/jail.local
  sed -i '/^\[nginx-bad-request\]/,/^$/ s/^enabled  = true/enabled  = false/' /etc/fail2ban/jail.local
fi

echo "==> Fail2ban neu starten…"
systemctl enable --now fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban

echo "✓ Fail2ban aktiv. Status:"
fail2ban-client status 2>/dev/null || true
echo
echo "Hinweis: Trag deine Admin-IP in jail.local unter 'ignoreip' ein, damit du"
echo "dich nicht selbst aussperrst."
