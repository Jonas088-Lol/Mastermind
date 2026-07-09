# Cloudflare Edge-WAF — Konfiguration (Phase 2.1)

Cloudflare ist die **erste** WAF-Schicht (vor dem Origin). Da die Einstellungen
UI-basiert sind, hier versioniert festgehalten — bei Änderungen dieses Dokument
mitpflegen. (Optional als Terraform: `cloudflare_ruleset`-Provider.)

## 1. SSL/TLS
- **SSL/TLS → Overview:** `Full (Strict)` — Cloudflare prüft das Origin-Zertifikat.
- **Edge Certificates:** TLS 1.3 an, Min TLS `1.2`, Automatic HTTPS Rewrites an,
  HSTS an (`max-age` 6 Monate+, includeSubDomains, Preload — erst nach Test).
- **Authenticated Origin Pulls** (zone-level) an → siehe Phase 1 nginx-Teil.

## 2. Managed Rules (WAF)
- **Security → WAF → Managed rules:**
  - `Cloudflare Managed Ruleset` → **On** (Action: Block bei hoher Konfidenz,
    Managed Challenge bei mittlerer).
  - `Cloudflare OWASP Core Ruleset` → **On**, Paranoia Level 1 (erst PL1;
    höher nur nach Tuning, sonst False Positives), Anomaly-Score-Threshold
    Standard.

## 3. Rate Limiting Rules
`Security → WAF → Rate limiting rules` (echte Client-IP nutzt CF automatisch):

| Name | Match | Limit | Action |
|---|---|---|---|
| login-brute | `http.request.uri.path contains "/login"` und Methode POST | 10 / 10 min pro IP | Managed Challenge |
| register | `.../register` oder `.../api/auth` POST | 10 / 10 min | Managed Challenge |
| ai-generate | `http.request.uri.path contains "/api/ai/"` | 20 / 1 min pro IP | Block |
| password-reset | `.../passwort` POST | 5 / 15 min | Managed Challenge |
| global-api | `http.request.uri.path contains "/api/"` | 300 / 1 min pro IP | Block |

## 4. Bots
- **Security → Bots:** Bot Fight Mode an (bzw. Super Bot Fight Mode, falls Plan):
  „Definitely automated" → Block, „Likely automated" → Managed Challenge,
  Verified Bots (Google etc.) zulassen.

## 5. Custom WAF Rules
`Security → WAF → Custom rules`:
- **Block ohne User-Agent:** `not http.user_agent contains ""` bzw.
  `http.user_agent eq ""` → Block (Scanner/Skripte ohne UA).
- **Geo-Restriktion (optional, wenn nur DACH):**
  `not ip.geoip.country in {"DE" "AT" "CH"}` → Managed Challenge.
  ⚠ Nur wenn wirklich keine anderen Länder gebraucht werden.
- **Bekannte bösartige Pfade blocken:** `/wp-admin`, `/.env`, `/.git`,
  `xmlrpc.php` etc. → Block (spart Origin-Last, füttert kein CRS).

## 6. Verifikation
- `curl -A "" https://konvertis.de` (ohne UA) → geblockt/challenged.
- SQLi-Testpfad `https://konvertis.de/?id=1' OR '1'='1` → WAF-Event im
  Cloudflare-Dashboard (Security → Events).
- Login 15× hintereinander → Challenge nach 10 Versuchen.
