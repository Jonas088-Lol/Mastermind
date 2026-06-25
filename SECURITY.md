# MasterMind — Security Architecture

## Defense-in-Depth Overview

```
Internet
    │
    ▼
[Nginx / Cloudflare]        TLS 1.2+, HSTS, rate-limit zones, CORS for /downloads
    │
    ▼
[UFW]                       default deny, SSH rate-limited, optional CF-only lock
    │
    ▼
[src/middleware.ts]         CORS for /api/*, OPTIONS preflight
    │
    ▼
[src/proxy.ts → firewall]
  Layer 1 — Rate Limiter    10s sliding window, 2-min block (disable with SECURITY_RATE_LIMIT_ENABLED=false in dev)
  Layer 2 — Pattern Scanner SQL-i, XSS, path traversal, scanner UA, exploit probes
  Layer 3 — Brute-Force     8 auth failures → 30-min block (always active)
    │
    ▼
[next.config.ts headers]    CSP, X-Frame-Options, HSTS, Permissions-Policy, Referrer-Policy
    │
    ▼
[Route handlers]
  withApiSecurity()         Auth check, RBAC, per-route rate limiting, body validation
  guardAiRequest()          AI cost cap (daily, per-user), prompt length, model allowlist
    │
    ▼
[Anthropic API]             Data pseudonymized before sending (names → initials)
```

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `SECURITY_RATE_LIMIT_ENABLED` | `true` | Set `false` in dev to skip Layer 1 rate limiter. Layer 3 + AI cap always active. |
| `FIREWALL_WHITELIST_IPS` | _(empty)_ | Comma-separated IPs that bypass all firewall layers. |
| `ALLOWED_ORIGINS` | _(empty)_ | Extra CORS origins in addition to `NEXT_PUBLIC_APP_URL`. |
| `AI_DAILY_CAP_PER_USER` | `100` | Max AI requests per user per day (ai-guard daily cap). |

## Key Files

| File | Purpose |
|---|---|
| `src/middleware.ts` | CORS handling + calls proxy() |
| `src/proxy.ts` | Gate, maintenance mode, 3-layer firewall |
| `src/lib/security/firewall.ts` | Layer 1 rate limiter, Layer 2 pattern scanner, Layer 3 brute-force |
| `src/lib/security/rate-limit.ts` | Upstash Redis sliding-window rate limiter (in-memory fallback) |
| `src/lib/security/api-handler.ts` | `withApiSecurity()` — auth, RBAC, rate limit, body validation |
| `src/lib/security/ai-guard.ts` | AI cost cap, prompt length, model allowlist |
| `next.config.ts` | CSP, HSTS, security headers applied globally |
| `nginx/conf.d/mastermind.conf` | TLS config, nginx-level rate zones |
| `scripts/setup-ufw.sh` | UFW setup (default deny, SSH rate-limit, optional CF-only) |

## Cloudflare Dashboard Checklist

If using Cloudflare as a reverse proxy in front of nginx:

- [ ] **SSL/TLS mode → Full (strict)** — prevents downgrade to plain HTTP between CF and origin
- [ ] **Always Use HTTPS** — enabled
- [ ] **HSTS** — enable via CF dashboard (or rely on nginx header, not both)
- [ ] **Bot Fight Mode** — enable
- [ ] **WAF → OWASP Core Ruleset** — enable at sensitivity "Medium"
- [ ] **Rate Limiting Rule** — 100 req/10s per IP on `/*` as a backup to app-layer limits
- [ ] **Firewall Rule** — block countries outside your user base (optional)
- [ ] **Trusted Proxies** — nginx `set_real_ip_from` already configured for CF IP ranges
- [ ] **DDoS Protection** — auto-enabled, set to "High" sensitivity for /api/auth paths

## Using `withApiSecurity`

```typescript
import { withApiSecurity } from "@/lib/security/api-handler";
import { NextResponse } from "next/server";

function validateBody(raw: unknown): { title: string } {
  if (typeof raw !== "object" || raw === null || typeof (raw as { title?: unknown }).title !== "string") {
    throw new Error("title (string) ist erforderlich");
  }
  return { title: (raw as { title: string }).title.slice(0, 200) };
}

export const POST = withApiSecurity(
  async ({ session, body }) => {
    // session is guaranteed non-null, body is typed
    return NextResponse.json({ ok: true, user: session.email, title: body.title });
  },
  {
    roles: ["teacher", "admin"],
    validate: validateBody,
    rateLimit: { scope: "my-action", limit: 20, windowSec: 60 },
  }
);
```

## Using `guardAiRequest`

```typescript
import { guardAiRequest } from "@/lib/security/ai-guard";

const guard = await guardAiRequest({
  userId: session.email,
  promptChars: lastUserMessage.length,
  messageCount: messages.length,
});
if (!guard.ok) {
  return NextResponse.json({ error: guard.error }, { status: guard.status });
}
// guard.model is the validated/fallback model name
```
