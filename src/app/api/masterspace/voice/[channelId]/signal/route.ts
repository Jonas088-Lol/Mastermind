import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";

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

  const body = await req.json() as { type: string; to: string; data: unknown };
  if (!["offer", "answer", "ice"].includes(body.type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  gc();
  const signal: Signal = {
    id: nextId++,
    channelId,
    type: body.type as Signal["type"],
    from: session.userId,
    to: body.to,
    data: body.data,
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
