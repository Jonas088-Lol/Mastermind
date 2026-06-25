/**
 * 3-Layer Security Firewall
 *
 * Runs inside Next.js proxy (middleware). Module-level state persists within
 * the Node.js process (Docker / standalone). In a multi-instance / Edge
 * deployment, pair with Redis via Upstash instead.
 *
 * Layer 1 – Rate Limiter:  per-IP sliding-window counters
 * Layer 2 – Pattern Scan:  URL/UA/header pattern matching (SQL-i, XSS, …)
 * Layer 3 – Anomaly Watch: auth failures, 404 storms, repeated blocks
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
   LAYER 1 — RATE LIMITER
   ═══════════════════════════════════════════════════════════════════════════ */

interface RateEntry {
  count: number;
  windowStart: number;
}

// Per-IP counters: ip → { count, windowStart }
const rateStore = new Map<string, RateEntry>();
const RATE_GC_INTERVAL = 5 * 60 * 1000; // clean up every 5 min
let lastRateGc = Date.now();

function rateGc() {
  const now = Date.now();
  if (now - lastRateGc < RATE_GC_INTERVAL) return;
  lastRateGc = now;
  for (const [ip, e] of rateStore) {
    if (now - e.windowStart > 60_000) rateStore.delete(ip);
  }
}

function getRateLimit(pathname: string): number {
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/login") || pathname.startsWith("/gate")) {
    return 100;  // auth: 100 req / min
  }
  if (pathname.startsWith("/api/")) {
    return 300;  // api: 300 req / min
  }
  return 500;    // general: 500 req / min
}

function checkRateLimit(ip: string, pathname: string): FirewallResult {
  rateGc();
  const now = Date.now();
  const limit = getRateLimit(pathname);
  const entry = rateStore.get(ip);

  if (!entry || now - entry.windowStart > 60_000) {
    rateStore.set(ip, { count: 1, windowStart: now });
    return { blocked: false, ip };
  }

  entry.count++;
  rateStore.set(ip, entry);

  if (entry.count > limit) {
    return {
      blocked: true,
      layer: 1,
      reason: `Rate limit exceeded (${entry.count}/${limit} per min)`,
      level: entry.count > limit * 2 ? "high" : "medium",
      ip,
    };
  }
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

  // Probe path check (fast check first)
  if (PROBE_PATH_RE.test(req.nextUrl.pathname)) {
    return { blocked: true, layer: 2, reason: "Known exploit probe path", level: "high", ip };
  }

  // Scanner user-agent
  if (SCANNER_UA_RE.test(ua)) {
    return { blocked: true, layer: 2, reason: "Security scanner detected", level: "high", ip };
  }

  // Decode URL once for pattern checks
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

  // Check referer/origin for obvious spam
  const referer = req.headers.get("referer") ?? "";
  if (SQL_RE.test(referer) || XSS_RE.test(referer)) {
    return { blocked: true, layer: 2, reason: "Malicious referer header", level: "high", ip };
  }

  return { blocked: false, ip };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LAYER 3 — ANOMALY DETECTOR
   ═══════════════════════════════════════════════════════════════════════════ */

interface AnomalyEntry {
  authFailures: number;
  notFoundCount: number;
  blockCount: number;
  firstSeen: number;
  blockedUntil?: number;
}

const anomalyStore = new Map<string, AnomalyEntry>();
const ANOMALY_GC_INTERVAL = 10 * 60 * 1000;
let lastAnomalyGc = Date.now();

function anomalyGc() {
  const now = Date.now();
  if (now - lastAnomalyGc < ANOMALY_GC_INTERVAL) return;
  lastAnomalyGc = now;
  for (const [ip, e] of anomalyStore) {
    if (now - e.firstSeen > 60 * 60 * 1000) anomalyStore.delete(ip); // 1h
  }
}

function getOrCreateAnomaly(ip: string): AnomalyEntry {
  let e = anomalyStore.get(ip);
  if (!e) {
    e = { authFailures: 0, notFoundCount: 0, blockCount: 0, firstSeen: Date.now() };
    anomalyStore.set(ip, e);
  }
  return e;
}

export function recordAuthFailure(ip: string): void {
  const e = getOrCreateAnomaly(ip);
  e.authFailures++;
  // After 8 failures → 30-min block
  if (e.authFailures >= 8) {
    e.blockedUntil = Date.now() + 30 * 60 * 1000;
    sendSecurityAlert({
      ip,
      reason: `Brute-force: ${e.authFailures} auth failures`,
      level: "critical",
      layer: 3,
      url: "/api/auth",
    }).catch(() => undefined);
  }
  anomalyStore.set(ip, e);
}

export function recordBlockedRequest(ip: string): void {
  const e = getOrCreateAnomaly(ip);
  e.blockCount++;
  anomalyStore.set(ip, e);
}

function checkAnomalies(ip: string, req: NextRequest): FirewallResult {
  anomalyGc();
  const e = anomalyStore.get(ip);
  if (!e) return { blocked: false, ip };

  // Check if IP is in temporary block
  if (e.blockedUntil && Date.now() < e.blockedUntil) {
    const remaining = Math.ceil((e.blockedUntil - Date.now()) / 60_000);
    return {
      blocked: true,
      layer: 3,
      reason: `IP temporarily blocked (${remaining} min remaining, ${e.authFailures} auth failures)`,
      level: "critical",
      ip,
    };
  }

  // Too many previous blocks = escalating threat
  if (e.blockCount >= 20) {
    e.blockedUntil = Date.now() + 60 * 60 * 1000; // 1h
    anomalyStore.set(ip, e);
    return {
      blocked: true,
      layer: 3,
      reason: `Repeat offender: ${e.blockCount} blocked requests`,
      level: "critical",
      ip,
    };
  }

  return { blocked: false, ip };
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL ALERT
   ═══════════════════════════════════════════════════════════════════════════ */

const ALERT_EMAIL = "Jonas.Schwenk187@gmail.com";
const alertCooldowns = new Map<string, number>(); // ip → last alert timestamp

async function sendSecurityAlert(opts: {
  ip: string;
  reason: string;
  level: ThreatLevel;
  layer: 1 | 2 | 3;
  url: string;
  ua?: string;
}): Promise<void> {
  // Cooldown: max 1 alert per IP per 5 minutes
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
Layer:    ${opts.layer} (${opts.layer === 1 ? "Rate Limiter" : opts.layer === 2 ? "Pattern Scanner" : "Anomaly Detector"})
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

// Paths to skip entirely (static assets, health checks)
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

  // Skip static assets
  if (FIREWALL_SKIP.some((p) => pathname.startsWith(p))) {
    return { blocked: false, ip: getIp(req) };
  }

  const ip = getIp(req);

  if (isWhitelisted(ip)) return { blocked: false, ip };

  // Layer 3 first — check if IP is already in anomaly block
  const anomalyCheck = checkAnomalies(ip, req);
  if (anomalyCheck.blocked) {
    recordBlockedRequest(ip);
    return anomalyCheck;
  }

  // Layer 2 — pattern scan (stateless, fast)
  const patternCheck = checkPatterns(req, ip);
  if (patternCheck.blocked) {
    recordBlockedRequest(ip);
    // Fire alert without awaiting
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

  // Layer 1 — rate limit
  const rateCheck = checkRateLimit(ip, pathname);
  if (rateCheck.blocked) {
    recordBlockedRequest(ip);
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
