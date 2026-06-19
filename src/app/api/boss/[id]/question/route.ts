import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: battleId } = await params;

  const battle = await prisma.bossBattle.findFirst({
    where: { id: battleId, isActive: true, currentHp: { gt: 0 } },
  });
  if (!battle) return NextResponse.json({ error: "Boss not active" }, { status: 404 });

  // Find random MC question for this boss's subject + grade
  const where = {
    type: "mc",
    topic: {
      ...(battle.subject ? { subject: battle.subject } : {}),
      ...(battle.gradeLevel ? { grade: battle.gradeLevel } : {}),
    },
  };

  const count = await prisma.exerciseQuestion.count({ where });
  if (count === 0) {
    // Fallback: any MC question
    const fallbackCount = await prisma.exerciseQuestion.count({ where: { type: "mc" } });
    if (fallbackCount === 0) return NextResponse.json({ error: "No questions" }, { status: 404 });
    const skip = Math.floor(Math.random() * fallbackCount);
    const q = await prisma.exerciseQuestion.findFirst({ where: { type: "mc" }, skip, include: { topic: { select: { subject: true, grade: true } } } });
    if (!q) return NextResponse.json({ error: "No questions" }, { status: 404 });
    return NextResponse.json(sanitize(q));
  }

  const skip = Math.floor(Math.random() * count);
  const q = await prisma.exerciseQuestion.findFirst({ where, skip, include: { topic: { select: { subject: true, grade: true } } } });
  if (!q) return NextResponse.json({ error: "No questions" }, { status: 404 });

  return NextResponse.json(sanitize(q));
}

function sanitize(q: { id: string; prompt: string; options: string; topic: { subject: string; grade: number } }) {
  const opts = JSON.parse(q.options) as Array<{ text: string; correct?: boolean }>;
  // Strip correct flag before sending to client
  return {
    id: q.id,
    prompt: q.prompt,
    subject: q.topic.subject,
    grade: q.topic.grade,
    options: opts.map((o, i) => ({ id: i, text: o.text })),
  };
}
