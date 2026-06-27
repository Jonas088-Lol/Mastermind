/**
 * 3-Layer Security Firewall
 *
 * Layer 1 – Rate Limiter:  per-IP 10-second sliding window → 2-min block
 * Layer 2 – Pattern Scan:  URL/UA/header pattern matching (SQL-i, XSS, …)
 * Layer 3 – Brute-Force:   repeated auth failures → extended block
 */

import type { NextRequest } from "next/server";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type ThreatLevel = "low" | "medium" | "high" | "critical";

export interface FirewallResult {
  blocked: boolean;
  layer?: 1 | 2 | 3;
  reason?: string;
  level?: ThreatLevel;
  ip: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// IPs that skip all firewall checks — set FIREWALL_WHITELIST_IPS="1.2.3.4,5.6.7.8" in .env
const WHITELIST: Set<string> = new Set(
  (process.env.FIREWALL_WHITELIST_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
);

function isWhitelisted(ip: string): boolean {
  return WHITELIST.has(ip);
}

/* ═══════════════════════════════════════════════════════════════════════════
   LAYER 1 — RATE LIMITER (10-second window → 2-minute block)
   ═══════════════════════════════════════════════════════════════════════════ */

const RATE_WINDOW    = 10_000;          // 10 seconds
const RATE_BLOCK_MS  = 30 * 1000;       // 30-second block when exceeded (was 2 min — caused false positives for school NATs)

interface RateEntry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

const rateStore = new Map<string, RateEntry>();

// Clean up stale entries every 5 min
const RATE_GC_INTERVAL = 5 * 60 * 1000;
let lastRateGc = Date.now();

function rateGc() {
  const now = Date.now();
  if (now - lastRateGc < RATE_GC_INTERVAL) return;
  lastRateGc = now;
  for (const [ip, e] of rateStore) {
    const expired = now - e.windowStart > RATE_WINDOW;
    const unblocked = !e.blockedUntil || now > e.blockedUntil;
    if (expired && unblocked) rateStore.delete(ip);
  }
}

// Separate counters so browsing the app never pollutes the auth quota.
// "auth"    → POST to /login, POST to /gate, any /api/auth/* → 30 req/10s
// "general" → all other requests (pages, API calls, etc.)   → 150 req/10s
function getRateBucket(pathname: string, method: string): "auth" | "general" {
  if (pathname.startsWith("/api/auth")) return "auth";
  // Only count form submissions (POST/PUT) on auth pages as auth, not plain page GETs.
  // Next.js Server Actions POST to the page route itself.
  if (
    method === "POST" &&
    (pathname.startsWith("/login") || pathname.startsWith("/gate"))
  ) {
    return "auth";
  }
  return "general";
}

const RATE_LIMITS: Record<"auth" | "general", number> = {
  auth:    30,   // 30 login/gate submissions per 10s per IP (covers multi-tab)
  general: 600,  // 600 req/10s — school NATs can have 20+ students on same IP; 150 was too low
};

function checkRateLimit(ip: string, pathname: string, method: string): FirewallResult {
  // Allow disabling Layer 1 in dev via env flag.
  // Layer 3 (brute-force) and ai-guard daily cap are always active.
  if (process.env.SECURITY_RATE_LIMIT_ENABLED === "false") {
    return { blocked: false, ip };
  }
  rateGc();
  const now = Date.now();

  const bucket = getRateBucket(pathname, method);
  const storeKey = `${ip}:${bucket}`;
  const entry = rateStore.get(storeKey) ?? { count: 0, windowStart: now };

  // Still in a block period from a previous burst
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const remaining = Math.ceil((entry.blockedUntil - now) / 60_000);
    return {
      blocked: true,
      layer: 1,
      reason: `Zu viele Anfragen — blockiert fuer ${remaining} min`,
      level: "medium",
      ip,
    };
  }

  // Reset window when expired
  if (now - entry.windowStart > RATE_WINDOW) {
    entry.count = 1;
    entry.windowStart = now;
    entry.blockedUntil = undefined;
  } else {
    entry.count++;
  }

  const limit = RATE_LIMITS[bucket];

  if (entry.count > limit) {
    entry.blockedUntil = now + RATE_BLOCK_MS;
    rateStore.set(storeKey, entry);
    return {
      blocked: true,
      layer: 1,
      reason: `Rate limit (${bucket}): ${entry.count} Anfragen in 10s (Limit ${limit}) — 2 min blockiert`,
      level: "medium",
      ip,
    };
  }

  rateStore.set(storeKey, entry);
  return { blocked: false, ip };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LAYER 2 — PATTERN SCANNER
   ═══════════════════════════════════════════════════════════════════════════ */

// SQL injection
const SQL_RE = /(\b(select|insert|update|delete|drop|truncate|union|exec|execute|declare|cast|convert|xp_|sp_|information_schema|sys\.|char\(|nchar\()\b|'[\s\S]*?--|;[\s\S]*?--|\/\*[\s\S]*?\*\/)/i;

// XSS
const XSS_RE = /<[\s\S]*?script[\s\S]*?>|javascript\s*:|data\s*:\s*text\/html|on\w+\s*=|<\s*iframe|<\s*object|<\s*embed|vbscript\s*:/i;

// Path traversal
const PATH_RE = /\.{2,}[/\\]|%2e{2,}%2f|%252e{2,}|\.%2f/i;

// Scanner / pentest user agents
const SCANNER_UA_RE = /sqlmap|nikto|nmap|masscan|zgrab|hydra|medusa|metasploit|burpsuite|havij|acunetix|openvas|nessus|dirbuster|gobuster|wfuzz|arachni|curl\/7\.([0-5]|6[0-5])\.|python-requests\/(0|1\.|2\.[01])|scrapy/i;

// Common exploit probe paths
const PROBE_PATH_RE = /\/(wp-admin|wp-login|wp-config|admin\.php|shell\.php|c99\.php|r57\.php|webshell|phpinfo|\.env|\.git\/|\.svn\/|\.htaccess|\/etc\/passwd|\/etc\/shadow|xmlrpc\.php|phpmyadmin|adminer|setup\.php|install\.php|eval-stdin)/i;

// Command injection
const CMD_RE = /[;&|`]\s*(rm|wget|curl|bash|sh|python|perl|ruby|nc |netcat|chmod|chown|cat \/etc|ls -)/i;

function checkPatterns(req: NextRequest, ip: string): FirewallResult {
  const url = req.nextUrl.pathname + (req.nextUrl.search ?? "");
  const ua = req.headers.get("user-agent") ?? "";

  if (PROBE_PATH_RE.test(req.nextUrl.pathname)) {
    return { blocked: true, layer: 2, reason: "Known exploit probe path", level: "high", ip };
  }
  if (SCANNER_UA_RE.test(ua)) {
    return { blocked: true, layer: 2, reason: "Security scanner detected", level: "high", ip };
  }

  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch { /* keep raw */ }

  if (PATH_RE.test(decoded)) {
    return { blocked: true, layer: 2, reason: "Path traversal attempt", level: "critical", ip };
  }
  if (SQL_RE.test(decoded)) {
    return { blocked: true, layer: 2, reason: "SQL injection pattern", level: "critical", ip };
  }
  if (XSS_RE.test(decoded)) {
    return { blocked: true, layer: 2, reason: "XSS pattern detected", level: "critical", ip };
  }
  if (CMD_RE.test(decoded)) {
    return { blocked: true, layer: 2, reason: "Command injection attempt", level: "critical", ip };
  }

  const referer = req.headers.get("referer") ?? "";
  if (SQL_RE.test(referer) || XSS_RE.test(referer)) {
    return { blocked: true, layer: 2, reason: "Malicious referer header", level: "high", ip };
  }

  return { blocked: false, ip };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LAYER 3 — BRUTE-FORCE DETECTOR (nur Auth-Failures)
   ═══════════════════════════════════════════════════════════════════════════ */

interface BruteEntry {
  authFailures: number;
  firstSeen: number;
  blockedUntil?: number;
}

const bruteStore = new Map<string, BruteEntry>();
const BRUTE_GC_INTERVAL = 10 * 60 * 1000;
let lastBruteGc = Date.now();

function bruteGc() {
  const now = Date.now();
  if (now - lastBruteGc < BRUTE_GC_INTERVAL) return;
  lastBruteGc = now;
  for (const [ip, e] of bruteStore) {
    const old = now - e.firstSeen > 60 * 60 * 1000;
    const unblocked = !e.blockedUntil || now > e.blockedUntil;
    if (old && unblocked) bruteStore.delete(ip);
  }
}

export function recordAuthFailure(ip: string): void {
  const e = bruteStore.get(ip) ?? { authFailures: 0, firstSeen: Date.now() };
  e.authFailures++;
  // 8+ failed logins → 30-min block
  if (e.authFailures >= 8) {
    e.blockedUntil = Date.now() + 30 * 60 * 1000;
    sendSecurityAlert({
      ip,
      reason: `Brute-force: ${e.authFailures} Auth-Fehler`,
      level: "critical",
      layer: 3,
      url: "/api/auth",
    }).catch(() => undefined);
  }
  bruteStore.set(ip, e);
}

function checkBruteForce(ip: string): FirewallResult {
  bruteGc();
  const e = bruteStore.get(ip);
  if (!e?.blockedUntil || Date.now() >= e.blockedUntil) return { blocked: false, ip };

  const remaining = Math.ceil((e.blockedUntil - Date.now()) / 60_000);
  return {
    blocked: true,
    layer: 3,
    reason: `IP blockiert wegen Brute-Force (${remaining} min verbleibend, ${e.authFailures} Auth-Fehler)`,
    level: "critical",
    ip,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL ALERT
   ═══════════════════════════════════════════════════════════════════════════ */

const ALERT_EMAIL = "Jonas.Schwenk187@gmail.com";
const alertCooldowns = new Map<string, number>();

async function sendSecurityAlert(opts: {
  ip: string;
  reason: string;
  level: ThreatLevel;
  layer: 1 | 2 | 3;
  url: string;
  ua?: string;
}): Promise<void> {
  const last = alertCooldowns.get(opts.ip);
  if (last && Date.now() - last < 5 * 60 * 1000) return;
  alertCooldowns.set(opts.ip, Date.now());

  const now = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  const levelEmoji = { low: "🟡", medium: "🟠", high: "🔴", critical: "🚨" }[opts.level];

  const subject = `${levelEmoji} MasterMind Security Alert — Layer ${opts.layer} — ${opts.level.toUpperCase()}`;
  const body = `
MasterMind Security Alert
==========================

Zeit:     ${now}
Level:    ${opts.level.toUpperCase()} ${levelEmoji}
Layer:    ${opts.layer} (${opts.layer === 1 ? "Rate Limiter" : opts.layer === 2 ? "Pattern Scanner" : "Brute-Force Detector"})
IP:       ${opts.ip}
Grund:    ${opts.reason}
URL:      ${opts.url}
UA:       ${opts.ua ?? "—"}

Maßnahme: Anfrage wurde blockiert.

──────────────────────────────────────
Wenn du diese Aktivität nicht erkennst, prüfe die Logs sofort.
— MasterMind Security
`.trim();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[Firewall] ALERT (no email configured): ${subject}\n${body}`);
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "security@mastermind.app",
        to: [ALERT_EMAIL],
        subject,
        text: body,
      }),
    });
  } catch {
    console.error("[Firewall] Failed to send security alert email");
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC API — runFirewall()
   ═══════════════════════════════════════════════════════════════════════════ */

const FIREWALL_SKIP = [
  "/_next/",
  "/favicon",
  "/brand/",
  "/uploads/",
  "/api/health",
  "/sw.js",
  "/manifest",
  "/apple-icon",
  "/opengraph-image",
  "/api/splash",
];

export async function runFirewall(req: NextRequest): Promise<FirewallResult> {
  const pathname = req.nextUrl.pathname;

  if (FIREWALL_SKIP.some((p) => pathname.startsWith(p))) {
    return { blocked: false, ip: getIp(req) };
  }

  // Next.js Router prefetch requests are read-only GETs triggered by the browser
  // when links become visible. They cannot cause harm and must not consume rate-limit
  // quota — otherwise page loads with many visible links (nav + hero + features)
  // would deplete the counter before the user clicks anything.
  if (req.headers.get("next-router-prefetch") === "1") {
    return { blocked: false, ip: getIp(req) };
  }

  // RSC (React Server Component) navigation requests are normal Next.js page transitions.
  // They are browser-initiated, cannot carry attack payloads in a meaningful way,
  // and excluding them from rate-limiting prevents false-positive blocks when a user
  // navigates quickly between pages (e.g. landing → login).
  if (req.headers.get("rsc") === "1") {
    return { blocked: false, ip: getIp(req) };
  }

  const ip = getIp(req);

  if (isWhitelisted(ip)) return { blocked: false, ip };

  // Layer 3 — Brute-force block (only from real auth failures)
  const bruteCheck = checkBruteForce(ip);
  if (bruteCheck.blocked) return bruteCheck;

  // Layer 2 — Pattern scan (runs even on prefetches that pass the header check above)
  const patternCheck = checkPatterns(req, ip);
  if (patternCheck.blocked) {
    void sendSecurityAlert({
      ip,
      reason: patternCheck.reason ?? "Pattern match",
      level: patternCheck.level ?? "high",
      layer: 2,
      url: pathname + (req.nextUrl.search ?? ""),
      ua: req.headers.get("user-agent") ?? undefined,
    });
    return patternCheck;
  }

  // Layer 1 — Rate limit (10s window, separate auth vs general bucket)
  const rateCheck = checkRateLimit(ip, pathname, req.method);
  if (rateCheck.blocked) {
    void sendSecurityAlert({
      ip,
      reason: rateCheck.reason ?? "Rate limit",
      level: rateCheck.level ?? "medium",
      layer: 1,
      url: pathname,
      ua: req.headers.get("user-agent") ?? undefined,
    });
    return rateCheck;
  }

  return { blocked: false, ip };
}
