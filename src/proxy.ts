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

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
      if (!isGateValid(gateToken)) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
