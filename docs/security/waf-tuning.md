# Origin-WAF (ModSecurity + OWASP CRS) — Rollout & Tuning (Phase 2.2)

Zweite WAF-Schicht direkt am Origin (nginx), falls ein Angriff Cloudflare
passiert. Bewusst **DetectionOnly zuerst** — scharf schalten erst nach Tuning.

## Warum ModSecurity als eigenes Image statt Eigenbau

`nginx:1.25-alpine` hat kein ModSecurity. Statt einen fragilen `xcaddy`-artigen
Eigenbau zu pflegen, nutzen wir das **offizielle OWASP-Image**
`owasp/modsecurity-crs:nginx-alpine` — nginx + ModSecurity + CRS vorgebaut,
gepflegt vom CRS-Projekt. Das ist „nginx behalten", nur mit WAF-Batterien.

## Umstieg auf das WAF-Image

In `docker-compose.yml` beim `nginx`-Service das Image tauschen:

```yaml
  nginx:
    # image: nginx:1.25-alpine            # vorher
    image: owasp/modsecurity-crs:nginx-alpine
    environment:
      DOMAIN: ${DOMAIN:-konvertis.de}
      MODSEC_RULE_ENGINE: DetectionOnly   # Start: nur loggen
      MODSEC_AUDIT_LOG_FORMAT: JSON
      MODSEC_AUDIT_LOG_PARTS: "ABIJDEFHZ" # kein Request-Body → keine PII im Log
      PARANOIA: "1"                        # PL1 zuerst
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/templates:ro
      - ./nginx/cloudflare-realip.conf:/etc/nginx/cloudflare-realip.conf:ro
      - ./nginx/modsec/crs-exclusions.conf:/etc/nginx/modsec/crs-exclusions.conf:ro
      - modsec_logs:/var/log
      # ... certbot-Volumes wie gehabt
```
(Das Image lädt CRS selbst; unsere `nginx/modsec/main.conf` dient als Referenz
für die Direktiven, falls du doch selbst baust.)

## Tuning-Ablauf (kontrolliert scharf schalten)

1. **Deployen im DetectionOnly-Modus.** Nichts wird geblockt, alles geloggt.
2. **Ein paar Tage echten Traffic** laufen lassen — inkl. der Features, die
   „gefährlich" aussehen: Heft-Formeln (LaTeX `\`, `{}`, `^`), Rich-Text in
   Nachrichten/Notizen, Datei-Uploads, KI-Chat.
3. **Audit-Log auswerten:**
   ```bash
   docker compose exec nginx sh -c 'tail -n 500 /var/log/modsec_audit.log' \
     | grep -oE '"id":"[0-9]+"' | sort | uniq -c | sort -rn
   ```
   Das zeigt, welche Regel-IDs am häufigsten (fälschlich) treffen.
4. **False Positives eintragen** in `nginx/modsec/crs-exclusions.conf` —
   so eng wie möglich (nur betroffene Route + Regel-ID), mit Kommentar warum.
   Beispiele stehen dort auskommentiert.
5. **Erneut prüfen**, bis keine legitimen Requests mehr treffen.
6. **Scharf schalten:** `MODSEC_RULE_ENGINE: On` (bzw. `SecRuleEngine On`).
   Ab jetzt werden Angriffe geblockt.
7. **Paranoia erhöhen** (PL2) nur, wenn PL1 sauber läuft und du mehr willst.

## Verifikation (nach Scharfschaltung)

| Test | Erwartung |
|---|---|
| `curl "https://konvertis.de/?x=1' OR '1'='1"` | 403 (SQLi geblockt) |
| `curl "https://konvertis.de/?x=<script>alert(1)</script>"` | 403 (XSS geblockt) |
| Normaler Login / Heft mit Formel / Nachricht senden | 200 (kein False Positive) |
| `tail /var/log/modsec_audit.log` | Angriffe geloggt, legitimer Traffic nicht |
