import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { parseObject, oneOf, str } from "@/lib/security/validate";

export const dynamic = "force-dynamic";

// ── In-memory signal store ─────────────────────────────────────────────────
// Suitable for single-server Docker deployment.
// Each signal has a monotonic id; clients poll with ?after=<lastId>.

interface Signal {
  id: number;
  channelId: string;
  type: "offer" | "answer" | "ice";
  from: string;
  to: string;
  data: unknown;
  createdAt: number;
}

let nextId = 1;
const signals: Signal[] = [];

// GC signals older than 2 minutes
function gc() {
  const cutoff = Date.now() - 2 * 60 * 1000;
  const idx = signals.findIndex((s) => s.createdAt >= cutoff);
  if (idx > 0) signals.splice(0, idx);
}

// ── Auth helper ────────────────────────────────────────────────────────────

async function authorize(channelId: string, userId: string) {
  const channel = await prisma.spaceChannel.findUnique({
    where: { id: channelId },
    select: { spaceId: true },
  });
  if (!channel) return false;
  const member = await prisma.spaceMember.findFirst({
    where: { spaceId: channel.spaceId, userId },
  });
  return !!member;
}

// ── POST — push a signal ───────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;
  if (!(await authorize(channelId, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = parseObject(raw, {
    type: oneOf(["offer", "answer", "ice"] as const),
    to: str({ min: 1, max: 64 }),
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  // data ist ein opakes WebRTC-Payload (SDP/ICE) — Größe begrenzen gegen Abuse.
  const data = (raw as { data?: unknown }).data;
  if (JSON.stringify(data ?? null).length > 16_000) {
    return NextResponse.json({ error: "Payload zu groß" }, { status: 413 });
  }

  gc();
  const signal: Signal = {
    id: nextId++,
    channelId,
    type: parsed.value.type,
    from: session.userId,
    to: parsed.value.to,
    data,
    createdAt: Date.now(),
  };
  signals.push(signal);

  return NextResponse.json({ ok: true, id: signal.id });
}

// ── GET — poll signals ─────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;
  if (!(await authorize(channelId, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const after = parseInt(req.nextUrl.searchParams.get("after") ?? "0", 10);

  gc();
  const result = signals.filter(
    (s) => s.channelId === channelId && s.to === session.userId && s.id > after
  );

  return NextResponse.json({ signals: result });
}
