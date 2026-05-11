import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai";
import { prisma } from "@/lib/db/client";
import { isEmailConfigured } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  let dbOk = false;
  let dbLatencyMs: number | null = null;
  let dbError: string | undefined;

  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "unknown";
  }

  const status = dbOk ? "ok" : "degraded";
  const httpStatus = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      uptime: process.uptime(),
      checked_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      services: {
        db: {
          ok: dbOk,
          latency_ms: dbLatencyMs,
          error: dbError,
        },
        ai: {
          configured: isAiConfigured(),
        },
        email: {
          configured: isEmailConfigured(),
        },
      },
      runtime: {
        node: process.version,
        env: process.env.NODE_ENV ?? "unknown",
      },
    },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
