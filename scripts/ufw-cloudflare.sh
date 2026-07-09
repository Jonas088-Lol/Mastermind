#!/usr/bin/env bash
# ── ufw: 80/443 NUR von Cloudflare-IPs erlauben (idempotent) ────────────────
#
# WARUM: Wenn nur Cloudflare den Origin erreichen darf, laufen alle Angriffe
# zwangsweise durch die Cloudflare-WAF/Rate-Limits. Direkte Angriffe auf die
# Server-IP (unter Umgehung von Cloudflare) werden auf L3/4 verworfen.
#
# Das Skript ist idempotent: es entfernt zuerst ALLE alten CF-Regeln (erkennbar
# am Kommentar-Tag) und setzt sie frisch. Wöchentlich per systemd-Timer, weil
# Cloudflare seine Ranges selten, aber gelegentlich ändert.
#
# Nutzung:  sudo bash scripts/ufw-cloudflare.sh
set -euo pipefail

CF_TAG="cf-origin"           # Kommentar-Tag zum Wiedererkennen unserer Regeln
SSH_PORT="${SSH_PORT:-2222}" # muss zum sshd-Port passen (siehe 99-hardening.conf)
ADMIN_IP="${ADMIN_IP:-}"     # optional: feste Admin-IP für SSH (sonst weltweit rate-limited)

if [[ $EUID -ne 0 ]]; then echo "Bitte mit sudo/root ausführen." >&2; exit 1; fi
command -v ufw >/dev/null || { echo "ufw nicht installiert." >&2; exit 1; }

echo "==> Cloudflare-Ranges abrufen…"
CF_V4="$(curl -sf --max-time 15 https://www.cloudflare.com/ips-v4 || true)"
CF_V6="$(curl -sf --max-time 15 https://www.cloudflare.com/ips-v6 || true)"
if [[ -z "$CF_V4" ]]; then
  echo "FEHLER: Cloudflare-IPv4-Ranges nicht abrufbar — Abbruch (keine Änderung)." >&2
  exit 1
fi

echo "==> Alte '$CF_TAG'-Regeln entfernen (idempotent)…"
# ufw-Regeln nach Nummer rückwärts löschen, wenn sie unser Tag tragen
while true; do
  NUM="$(ufw status numbered | grep "$CF_TAG" | head -1 | sed -E 's/^\[ *([0-9]+)\].*/\1/' || true)"
  [[ -z "$NUM" ]] && break
  yes | ufw delete "$NUM" >/dev/null
done

echo "==> Defaults setzen…"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null

echo "==> SSH freigeben (Port $SSH_PORT)…"
if [[ -n "$ADMIN_IP" ]]; then
  ufw allow from "$ADMIN_IP" to any port "$SSH_PORT" proto tcp comment "$CF_TAG ssh-admin" >/dev/null
else
  ufw limit "$SSH_PORT"/tcp comment "$CF_TAG ssh-ratelimited" >/dev/null
fi

echo "==> 80/443 nur von Cloudflare erlauben…"
add_rules() {
  local ip
  while read -r ip; do
    [[ -z "$ip" ]] && continue
    ufw allow from "$ip" to any port 80  proto tcp comment "$CF_TAG http"  >/dev/null
    ufw allow from "$ip" to any port 443 proto tcp comment "$CF_TAG https" >/dev/null
  done <<< "$1"
}
add_rules "$CF_V4"
[[ -n "$CF_V6" ]] && add_rules "$CF_V6"

ufw --force enable >/dev/null
echo "✓ Fertig. Aktive Regeln:"
ufw status | grep -E "$CF_TAG|Status" || true
echo
echo "Hinweis: Prüfe VOR dem Schließen deiner Session, dass SSH auf Port $SSH_PORT erreichbar ist."
