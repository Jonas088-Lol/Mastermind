#!/usr/bin/env bash
# ── nginx real_ip: Cloudflare-Ranges als set_real_ip_from generieren ───────
#
# WARUM: Hinter Cloudflare ist $remote_addr die CF-IP. Damit Rate-Limits,
# Logs und die App die ECHTE Nutzer-IP sehen, muss nginx dem
# CF-Connecting-IP-Header vertrauen — aber NUR von echten Cloudflare-Ranges
# (sonst könnte jeder den Header fälschen und Rate-Limits/Bans umgehen).
#
# Erzeugt eine Datei mit `set_real_ip_from <CF-Range>;` je Range, die im
# http-Block via include eingebunden wird (siehe nginx.conf).
#
# Nutzung (auf dem Server, Pfad ggf. anpassen):
#   sudo bash scripts/nginx-cloudflare-realip.sh /pfad/zu/nginx/cloudflare-realip.conf
# Danach nginx-Container neu laden.
set -euo pipefail

OUT="${1:-./nginx/cloudflare-realip.conf}"
TMP="$(mktemp)"

CF_V4="$(curl -sf --max-time 15 https://www.cloudflare.com/ips-v4 || true)"
CF_V6="$(curl -sf --max-time 15 https://www.cloudflare.com/ips-v6 || true)"
if [[ -z "$CF_V4" ]]; then
  echo "FEHLER: Cloudflare-Ranges nicht abrufbar — Abbruch (keine Änderung)." >&2
  exit 1
fi

{
  echo "# AUTO-GENERIERT von scripts/nginx-cloudflare-realip.sh — nicht manuell editieren."
  echo "# Vertraut CF-Connecting-IP NUR von diesen Cloudflare-Ranges."
  while read -r r; do [[ -n "$r" ]] && echo "set_real_ip_from $r;"; done <<< "$CF_V4"
  while read -r r; do [[ -n "$r" ]] && echo "set_real_ip_from $r;"; done <<< "$CF_V6"
} > "$TMP"

mv "$TMP" "$OUT"
echo "✓ $(grep -c set_real_ip_from "$OUT") Cloudflare-Ranges → $OUT"
