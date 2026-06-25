/**
 * Next.js Middleware — CORS + Security Proxy
 *
 * Runs on every request before rendering:
 *   1. Preflight (OPTIONS) → 204 with CORS headers
 *   2. CORS headers injected on /api/* responses
 *   3. proxy() → firewall (3 layers) + gate + maintenance
 *
 * Security headers (CSP, HSTS, X-Frame-Options, …) are set in next.config.ts
 * via the headers() function so they apply to all responses including static files.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { proxy, config as proxyConfig } from "@/proxy";

/* ── CORS ─────────────────────────────────────────────────────────────────── */

// Own domain — set via NEXT_PUBLIC_APP_URL in .env.production
const SELF = process.env.NEXT_PUBLIC_APP_URL ?? "";

// Additional origins from env (comma-separated)
const EXTRA = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Always allow Capacitor/Ionic mobile app origins + dev localhost
const ALLOWED: ReadonlySet<string> = new Set(
  [
    SELF,
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8100",
    ...EXTRA,
  ].filter(Boolean)
);

function buildCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/* ── Middleware entry ─────────────────────────────────────────────────────── */

export async function middleware(req: NextRequest): Promise<NextResponse | Response> {
  const origin = req.headers.get("origin");
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  // Handle CORS preflight before the firewall so OPTIONS never gets 403'd
  if (req.method === "OPTIONS" && isApi) {
    return new NextResponse(null, {
      status: 204,
      headers: buildCorsHeaders(origin),
    });
  }

  // Firewall + gate + maintenance
  const res = await proxy(req);

  // Inject CORS headers on API responses (allowed origins only)
  if (isApi) {
    const cors = buildCorsHeaders(origin);
    for (const [k, v] of Object.entries(cors)) {
      res.headers.set(k, v);
    }
  }

  return res;
}

export const config = proxyConfig;
