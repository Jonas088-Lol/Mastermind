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
    include: { questions: { select: { id: true } } },
  });
  if (!battle) return NextResponse.json({ error: "Boss not active" }, { status: 404 });

  // ── Path A: battle has custom questions ─────────────────────────────────
  if (battle.useCustomQuestions && battle.questions.length > 0) {
    const allIds = battle.questions.map((q) => q.id);

    const seenCorrect = await prisma.bossQuestionSeen.findMany({
      where: { userId: session.userId, questionId: { in: allIds }, answeredCorrect: true },
      select: { questionId: true },
    });
    const correctIds = new Set(seenCorrect.map((s) => s.questionId));
    const remaining = allIds.filter((id) => !correctIds.has(id));
    const pool = remaining.length > 0 ? remaining : allIds;

    const seenWrong = await prisma.bossQuestionSeen.findMany({
      where: { userId: session.userId, questionId: { in: pool }, answeredCorrect: false },
      select: { questionId: true },
    });
    const wrongIds = seenWrong.map((s) => s.questionId).filter((id) => pool.includes(id));
    const pickFrom = wrongIds.length > 0 ? wrongIds : pool;
    const pickedId = pickFrom[Math.floor(Math.random() * pickFrom.length)];

    const q = await prisma.bossQuestion.findUnique({ where: { id: pickedId } });
    if (!q) return NextResponse.json({ error: "No questions" }, { status: 404 });

    return NextResponse.json({
      id: q.id,
      question: q.question,
      subject: battle.subject ?? "Allgemein",
      grade: battle.gradeLevel ?? 0,
      source: "boss",
      options: [
        { id: 0, text: q.optionA },
        { id: 1, text: q.optionB },
        { id: 2, text: q.optionC },
        { id: 3, text: q.optionD },
      ],
    });
  }

  // ── Path B: Frage-Pool (KI-generierte Fragen) ───────────────────────────
  const fach  = (battle.subject ?? "").toLowerCase();
  const grade = battle.gradeLevel ?? null;

  // Prisma-Client kennt `frage` erst nach prisma generate — `as any` für Frage-Zugriffe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const frageWhere = (mitStufe: boolean) => ({
    fach,
    ...(mitStufe && grade ? { jahrgangsstufe: grade } : {}),
  });

  const pickFrage = async (mitStufe: boolean) => {
    const total = (await db.frage.count({ where: frageWhere(mitStufe) })) as number;
    if (total === 0) return null;
    return db.frage.findFirst({
      where: frageWhere(mitStufe),
      skip: Math.floor(Math.random() * total),
    }) as Promise<Record<string, unknown> | null>;
  };

  const frageQ = (fach ? (await pickFrage(true) ?? await pickFrage(false)) : null);

  if (frageQ) {
    const rawAntworten = frageQ.antworten;
    const antworten = (
      Array.isArray(rawAntworten)
        ? rawAntworten
        : JSON.parse(rawAntworten as string)
    ) as Array<{ id: string; text: string; korrekt: boolean }>;

    return NextResponse.json({
      id: `fq_${frageQ.id as string}`,
      question: frageQ.frage as string,
      subject: battle.subject ?? "Allgemein",
      grade: frageQ.jahrgangsstufe as number,
      source: "frage",
      options: antworten.map((a, i) => ({ id: i, text: a.text })),
    });
  }

  // ── Path B fallback: ExerciseQuestion-Pool ───────────────────────────────
  const subjectFilter = battle.subject ? { subject: battle.subject } : {};
  const whereExact   = { type: "mc", topic: { ...subjectFilter, ...(grade ? { grade } : {}) } };
  const whereSubject = { type: "mc", topic: subjectFilter };
  const whereAny     = { type: "mc" };

  const pickRandom = async (w: typeof whereAny) => {
    const total = await prisma.exerciseQuestion.count({ where: w });
    if (total === 0) return null;
    return prisma.exerciseQuestion.findFirst({
      where: w,
      skip: Math.floor(Math.random() * total),
      include: { topic: { select: { subject: true, grade: true } } },
    });
  };

  const q = await pickRandom(whereExact)
    ?? await pickRandom(whereSubject)
    ?? await pickRandom(whereAny);

  if (!q) return NextResponse.json({ error: "No questions" }, { status: 404 });

  const opts = q.options ? (JSON.parse(q.options) as string[]) : [];

  return NextResponse.json({
    id: q.id,
    question: q.question,
    subject: q.topic.subject,
    grade: q.topic.grade,
    source: "general",
    options: opts.map((text, i) => ({ id: i, text })),
  });
}
