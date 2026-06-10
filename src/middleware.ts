import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE = process.env.MAINTENANCE_MODE === "true";
const BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN ?? "";
const BYPASS_COOKIE = "mm_maint_bypass";

// Paths that are always accessible during maintenance
const ALWAYS_ALLOWED = [
  "/_next/",
  "/favicon",
  "/brand/",
  "/uploads/",
  "/api/maintenance",
  "/maintenance",
];

export function middleware(req: NextRequest) {
  if (!MAINTENANCE) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Allow static assets and maintenance page itself
  if (ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check bypass cookie
  const bypass = req.cookies.get(BYPASS_COOKIE)?.value;
  if (BYPASS_TOKEN && bypass === BYPASS_TOKEN) {
    return NextResponse.next();
  }

  // Redirect to maintenance page
  return NextResponse.redirect(new URL("/maintenance", req.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
