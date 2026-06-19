import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE = process.env.MAINTENANCE_MODE === "true";
const BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN ?? "";
const BYPASS_COOKIE = "mm_maint_bypass";

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

  // Maintenance mode
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
