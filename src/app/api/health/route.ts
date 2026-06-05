import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { rateLimit, ipFromHeaders } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = ipFromHeaders(req.headers);
  const rl = await rateLimit({ scope: "health", key: ip, limit: 30, windowSec: 60 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const startedAt = Date.now();

  let dbOk = false;
  let dbLatencyMs: number | null = null;

  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    // error details not exposed
  }

  const status = dbOk ? "ok" : "degraded";
  const httpStatus = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      uptime: process.uptime(),
      checked_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      db: {
        ok: dbOk,
        latency_ms: dbLatencyMs,
      },
    },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
