import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GATE_COOKIE, isGateValid } from "@/lib/gate";
import { runFirewall, recordAuthFailure } from "@/lib/security/firewall";

const MAINTENANCE = process.env.MAINTENANCE_MODE === "true";
const BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN ?? "";
const BYPASS_COOKIE = "mm_maint_bypass";

const GATE_SKIP = [
  "/gate",
  "/mails/login",
  "/_next/",
  "/favicon",
  "/brand/",
  "/uploads/",
  "/api/health",
  "/manifest",
  "/sw.js",
];

const MAINTENANCE_SKIP = [
  "/_next/",
  "/favicon",
  "/brand/",
  "/uploads/",
  "/api/maintenance",
  "/maintenance",
];

/* ── CORS ─────────────────────────────────────────────────────────────────── */

const SELF = process.env.NEXT_PUBLIC_APP_URL ?? "";
const EXTRA = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const CORS_ALLOWED: ReadonlySet<string> = new Set(
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
  if (!origin || !CORS_ALLOWED.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/* ── Proxy entry ─────────────────────────────────────────────────────────── */

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");
  const isApi = pathname.startsWith("/api/");

  // CORS preflight — handle before firewall so OPTIONS never gets 403'd
  if (req.method === "OPTIONS" && isApi) {
    return new NextResponse(null, {
      status: 204,
      headers: buildCorsHeaders(origin),
    });
  }

  // ── Security Firewall (3 layers) ─────────────────────────────────────────
  const fw = await runFirewall(req);
  if (fw.blocked) {
    const retryAfter = fw.layer === 1 ? "60" : "300";
    return new NextResponse(
      JSON.stringify({
        error: "Forbidden",
        reason: fw.reason,
        layer: fw.layer,
      }),
      {
        status: fw.level === "critical" ? 403 : 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter,
          "X-Firewall-Layer": String(fw.layer ?? 0),
        },
      }
    );
  }

  // ── CSRF-Schutz für state-changing API-Requests ──────────────────────────
  // Cross-Site-Requests mit Cookies (SameSite=Lax deckt Top-Level-Navigation
  // ab, aber nicht alle Fälle). Wenn ein Origin-Header gesetzt ist und NICHT in
  // der Allowlist steht, wird die schreibende Anfrage abgelehnt. Webhooks
  // (Mollie/Resend/Stripe) senden keinen Origin und sind über eigene Secrets
  // gesichert — sie dürfen ohne Origin passieren.
  const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  if (isApi && WRITE_METHODS.has(req.method) && origin) {
    if (!CORS_ALLOWED.has(origin)) {
      return new NextResponse(
        JSON.stringify({ error: "CSRF: Origin nicht erlaubt" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Record auth failures (called after failed login — see login actions.ts)
  // The app sets a header x-auth-failed: 1 on 401 responses; we detect it here
  // to feed Layer 3 data without needing a DB query in proxy.
  const authFailed = req.headers.get("x-auth-failed") === "1";
  if (authFailed) {
    recordAuthFailure(fw.ip);
  }

  const isNativeApp = req.headers.get("user-agent")?.includes("MasterMindApp/") ?? false;

  if (isNativeApp) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  } else {
    // ── Access gate (web only) ────────────────────────────────────────────
    if (!GATE_SKIP.some((p) => pathname.startsWith(p))) {
      const gateToken = req.cookies.get(GATE_COOKIE)?.value;
      if (!(await isGateValid(gateToken))) {
        const gateUrl = new URL("/gate", req.url);
        if (pathname !== "/") gateUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(gateUrl);
      }
    }
  }

  // ── Maintenance mode ──────────────────────────────────────────────────────
  if (MAINTENANCE) {
    if (!MAINTENANCE_SKIP.some((p) => pathname.startsWith(p))) {
      const bypass = req.cookies.get(BYPASS_COOKIE)?.value;
      if (!BYPASS_TOKEN || bypass !== BYPASS_TOKEN) {
        return NextResponse.redirect(new URL("/maintenance", req.url));
      }
    }
  }

  const res = NextResponse.next();

  // Inject CORS headers on API responses (allowed origins only)
  if (isApi) {
    const cors = buildCorsHeaders(origin);
    for (const [k, v] of Object.entries(cors)) {
      res.headers.set(k, v);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
