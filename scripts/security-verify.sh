#!/usr/bin/env bash
# ── Security-Verifikation MasterMind ───────────────────────────────────────
# Prüft die wichtigsten Härtungsmaßnahmen. Auf dem SERVER ausführen.
# Nutzung:  bash scripts/security-verify.sh [domain]
set -uo pipefail
DOMAIN="${1:-konvertis.de}"
PASS=0; FAIL=0
ok(){ echo "  ✓ $1"; PASS=$((PASS+1)); }
bad(){ echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "== Security-Verify für $DOMAIN =="

echo "[1] Security-Header"
H="$(curl -sI "https://$DOMAIN" 2>/dev/null || true)"
echo "$H" | grep -qi "strict-transport-security" && ok "HSTS" || bad "HSTS fehlt"
echo "$H" | grep -qi "x-content-type-options" && ok "X-Content-Type-Options" || bad "nosniff fehlt"
echo "$H" | grep -qi "x-frame-options" && ok "X-Frame-Options" || bad "X-Frame-Options fehlt"
echo "$H" | grep -qi "content-security-policy" && ok "CSP" || bad "CSP fehlt"

echo "[2] WAF / Angriffs-Payloads (nur wenn WAF scharf)"
CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/?x=1%27%20OR%20%271%27=%271" 2>/dev/null || echo 000)"
[ "$CODE" = "403" ] && ok "SQLi-Payload geblockt (403)" || echo "  ⚠ SQLi-Payload → $CODE (WAF evtl. noch DetectionOnly)"

echo "[3] Direkter Origin-Zugriff sollte scheitern"
# (nur sinnvoll mit bekannter Server-IP als 2. Argument)
if [ -n "${2:-}" ]; then
  RC="$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$DOMAIN:443:$2" "https://$DOMAIN" --max-time 5 2>/dev/null || echo 000)"
  echo "  (Origin-IP $2 über CF-Header → $RC; direkter IP-Aufruf sollte 444/leer sein)"
fi

echo "[4] Offene Ports (lokal)"
if command -v ss >/dev/null; then
  ss -tlnp 2>/dev/null | grep -qE ':5432' && bad "Postgres lauscht extern?!" || ok "Postgres nicht extern"
  ss -tlnp 2>/dev/null | grep -qE ':6379' && bad "Redis lauscht extern?!" || ok "Redis nicht extern"
fi

echo "[5] Firewall & Fail2ban"
command -v ufw >/dev/null && ufw status 2>/dev/null | grep -qi "Status: active" && ok "ufw aktiv" || bad "ufw inaktiv"
command -v fail2ban-client >/dev/null && fail2ban-client status >/dev/null 2>&1 && ok "Fail2ban aktiv" || bad "Fail2ban inaktiv"

echo "[6] Container-Health"
if command -v docker >/dev/null; then
  docker compose ps 2>/dev/null | grep -qi "healthy" && ok "Container healthy" || echo "  ⚠ Container-Status prüfen"
fi

echo
echo "== Ergebnis: $PASS ok, $FAIL Probleme =="
[ "$FAIL" -eq 0 ] && echo "✓ Grundhärtung sieht gut aus." || echo "✗ Bitte die ✗-Punkte prüfen."
