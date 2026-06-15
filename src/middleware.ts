import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GATE_COOKIE, isGateValid } from "@/lib/gate";

const MAINTENANCE = process.env.MAINTENANCE_MODE === "true";
const BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN ?? "";
const BYPASS_COOKIE = "mm_maint_bypass";

// Paths that skip the gate entirely
const GATE_SKIP = [
  "/gate",
  "/_next/",
  "/favicon",
  "/brand/",
  "/uploads/",
  "/api/health",
  "/manifest",
  "/sw.js",
];

// Paths that are always accessible during maintenance
const MAINTENANCE_SKIP = [
  "/_next/",
  "/favicon",
  "/brand/",
  "/uploads/",
  "/api/maintenance",
  "/maintenance",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Access gate ──────────────────────────────────────────────────────
  if (!GATE_SKIP.some((p) => pathname.startsWith(p))) {
    const gateToken = req.cookies.get(GATE_COOKIE)?.value;
    if (!isGateValid(gateToken)) {
      const gateUrl = new URL("/gate", req.url);
      if (pathname !== "/") gateUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(gateUrl);
    }
  }

  // ── 2. Maintenance mode ─────────────────────────────────────────────────
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
