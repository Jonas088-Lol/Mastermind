import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { assignmentId, eventType, count } = body as { assignmentId?: string; eventType?: string; count?: number };

  if (!assignmentId || !eventType) return NextResponse.json({ ok: false });

  await auditLog({
    actorId: session.userId,
    action: "exam.tab_switch",
    details: { assignmentId, eventType, count, schoolId: session.schoolId },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
