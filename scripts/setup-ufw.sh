#!/usr/bin/env bash
# Copyright 2026 Elian Schock, Jonas Schwenk
# UFW Firewall Setup — Ubuntu 24.04
# Usage:
#   sudo bash scripts/setup-ufw.sh              # public HTTP/HTTPS + SSH
#   sudo bash scripts/setup-ufw.sh --cloudflare-only  # restrict 80/443 to Cloudflare IPs only
set -euo pipefail

CLOUDFLARE_ONLY="${1:-}"

echo "==> Resetting UFW to defaults..."
ufw --force reset

# Defaults: deny all inbound, allow all outbound
ufw default deny incoming
ufw default allow outgoing

# SSH — rate-limited (6 connections per 30 seconds per IP)
ufw limit 22/tcp comment "SSH rate-limited"

if [[ "$CLOUDFLARE_ONLY" == "--cloudflare-only" ]]; then
  echo "==> Restricting HTTP/HTTPS to Cloudflare IP ranges only..."

  # Fetch current Cloudflare IPv4 ranges
  CF_IPV4=$(curl -sf https://www.cloudflare.com/ips-v4 || true)
  CF_IPV6=$(curl -sf https://www.cloudflare.com/ips-v6 || true)

  if [[ -z "$CF_IPV4" ]]; then
    echo "ERROR: Could not fetch Cloudflare IPs — aborting to avoid locking out HTTP/HTTPS"
    exit 1
  fi

  while IFS= read -r cidr; do
    [[ -z "$cidr" ]] && continue
    ufw allow from "$cidr" to any port 80 proto tcp comment "CF-HTTP"
    ufw allow from "$cidr" to any port 443 proto tcp comment "CF-HTTPS"
  done <<< "$CF_IPV4"

  while IFS= read -r cidr; do
    [[ -z "$cidr" ]] && continue
    ufw allow from "$cidr" to any port 80 proto tcp comment "CF-HTTP-v6"
    ufw allow from "$cidr" to any port 443 proto tcp comment "CF-HTTPS-v6"
  done <<< "$CF_IPV6"

  echo "==> Cloudflare-only mode: direct access to 80/443 is blocked."
else
  # Public HTTP + HTTPS
  ufw allow 80/tcp comment "HTTP"
  ufw allow 443/tcp comment "HTTPS"
fi

echo "==> Enabling UFW..."
ufw --force enable
ufw status verbose
