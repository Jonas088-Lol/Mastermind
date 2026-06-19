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

  const where = {
    type: "mc",
    topic: {
      ...(battle.subject ? { subject: battle.subject } : {}),
      ...(battle.gradeLevel ? { grade: battle.gradeLevel } : {}),
    },
  };

  let q;
  const count = await prisma.exerciseQuestion.count({ where });
  if (count === 0) {
    const fallbackCount = await prisma.exerciseQuestion.count({ where: { type: "mc" } });
    if (fallbackCount === 0) return NextResponse.json({ error: "No questions" }, { status: 404 });
    const skip = Math.floor(Math.random() * fallbackCount);
    q = await prisma.exerciseQuestion.findFirst({
      where: { type: "mc" },
      skip,
      include: { topic: { select: { subject: true, grade: true } } },
    });
  } else {
    const skip = Math.floor(Math.random() * count);
    q = await prisma.exerciseQuestion.findFirst({
      where,
      skip,
      include: { topic: { select: { subject: true, grade: true } } },
    });
  }

  if (!q) return NextResponse.json({ error: "No questions" }, { status: 404 });

  // options is a JSON array of plain strings: ["Berlin", "Hamburg", ...]
  // correct is the index as a string: "0", "1", "2", "3"
  // We strip `correct` before sending to the client
  const opts = q.options ? (JSON.parse(q.options) as string[]) : [];

  return NextResponse.json({
    id: q.id,
    question: q.question,
    subject: q.topic.subject,
    grade: q.topic.grade,
    options: opts.map((text, i) => ({ id: i, text })),
  });
}
