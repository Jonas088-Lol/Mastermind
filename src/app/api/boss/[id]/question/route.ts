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

  // Build progressively looser filters — always staying within the boss's subject.
  // Only fall back across all subjects if this subject has zero MC questions at all.
  const subjectFilter = battle.subject ? { subject: battle.subject } : {};

  const whereExact   = { type: "mc", topic: { ...subjectFilter, ...(battle.gradeLevel ? { grade: battle.gradeLevel } : {}) } };
  const whereSubject = { type: "mc", topic: subjectFilter };
  const whereAny     = { type: "mc" };

  let q;

  const pickRandom = async (w: typeof whereAny) => {
    const total = await prisma.exerciseQuestion.count({ where: w });
    if (total === 0) return null;
    return prisma.exerciseQuestion.findFirst({
      where: w,
      skip: Math.floor(Math.random() * total),
      include: { topic: { select: { subject: true, grade: true } } },
    });
  };

  q = await pickRandom(whereExact)
    ?? await pickRandom(whereSubject)
    ?? await pickRandom(whereAny);

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
