/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * withApiSecurity — typed wrapper for Next.js Route Handlers.
 *
 * Enforces in order:
 *   1. Authentication (session required by default)
 *   2. Role-based access (RBAC)
 *   3. Per-request rate limiting (Upstash or in-memory fallback)
 *   4. Body validation via a custom validator function
 *
 * Usage:
 *   export const POST = withApiSecurity(
 *     async ({ session, body }) => {
 *       return NextResponse.json({ ok: true });
 *     },
 *     {
 *       roles: ["admin"],
 *       validate: (raw) => mySchema.parse(raw),
 *       rateLimit: { scope: "admin:action", limit: 10, windowSec: 60 },
 *     }
 *   );
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession, effectiveRole } from "@/lib/session";
import type { Session } from "@/lib/session";
import { rateLimit, ipFromHeaders } from "@/lib/security/rate-limit";

/* ── Types ────────────────────────────────────────────────────────────────── */

type AppRole = "student" | "teacher" | "admin" | "parent" | "super";

export interface ApiHandlerOptions<TBody = unknown> {
  /** Require a valid session. Default: true. Set false for public endpoints. */
  requireAuth?: boolean;

  /** If set, caller must have one of these roles. */
  roles?: AppRole[];

  /**
   * Validate + transform the parsed request body.
   * Return the typed value or throw to send a 400.
   * Use any schema library (Zod, Valibot, plain JS) or a plain function.
   */
  validate?: (raw: unknown) => TBody;

  /** Rate-limit this handler. Key defaults to user email (session) or IP. */
  rateLimit?: {
    scope: string;
    limit: number;
    windowSec: number;
  };
}

export interface ApiContext<TBody = unknown> {
  req: NextRequest;
  session: Session;
  body: TBody;
}

type ApiHandler<TBody> = (
  ctx: ApiContext<TBody>
) => Promise<NextResponse | Response>;

/* ── withApiSecurity ─────────────────────────────────────────────────────── */

export function withApiSecurity<TBody = unknown>(
  handler: ApiHandler<TBody>,
  opts: ApiHandlerOptions<TBody> = {}
): (req: NextRequest) => Promise<NextResponse | Response> {
  return async function securedHandler(req: NextRequest) {
    const requireAuth = opts.requireAuth !== false;

    // 1 — Authentication
    const session = await getSession();
    if (requireAuth && !session) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    // 2 — RBAC
    if (session && opts.roles && opts.roles.length > 0) {
      const role = effectiveRole(session) as AppRole;
      if (!opts.roles.includes(role)) {
        return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
      }
    }

    // 3 — Rate limiting
    if (opts.rateLimit) {
      const rlKey = session?.email ?? ipFromHeaders(req.headers);
      const rl = await rateLimit({
        scope: opts.rateLimit.scope,
        key: rlKey,
        limit: opts.rateLimit.limit,
        windowSec: opts.rateLimit.windowSec,
      });
      if (!rl.ok) {
        return NextResponse.json(
          { error: "Zu viele Anfragen — kurz warten." },
          {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfterSec) },
          }
        );
      }
    }

    // 4 — Body validation (only when a validator is provided)
    let body: TBody = undefined as TBody;
    if (opts.validate) {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return NextResponse.json(
          { error: "Ungültiges JSON" },
          { status: 400 }
        );
      }
      try {
        body = opts.validate(raw);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Ungültige Eingabe";
        return NextResponse.json(
          { error: message },
          { status: 400 }
        );
      }
    }

    return handler({ req, session: session!, body });
  };
}
