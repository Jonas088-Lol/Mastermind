import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { SKILL_MAP } from "@/lib/skill-graph";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const node = SKILL_MAP.get(slug);
  if (!node) return NextResponse.json({ error: "Node not found" }, { status: 404 });

  // Check the node is unlocked for this user
  const mastery = await prisma.userSkillMastery.findUnique({
    where: { userId_nodeSlug: { userId: session.userId, nodeSlug: slug } },
  });
  if (!mastery || mastery.masteryTier < 1) {
    return NextResponse.json({ error: "Node not unlocked" }, { status: 403 });
  }

  // Determine which subject(s) and grade range to query
  const subjects = node.subjects ?? (node.subject ? [node.subject] : []);

  // Grade: tier-based (T1=5-6, T2=6-7, T4=8-9, T6=10-11, T8=12-13)
  // For fusion nodes use a wider range. For subject nodes use the tier-mapped grade.
  const tierGrade = node.tier ? Math.min(13, Math.max(5, 4 + node.tier)) : null;

  const pickRandom = async (where: Prisma.ExerciseQuestionWhereInput) => {
    const total = await prisma.exerciseQuestion.count({ where });
    if (total === 0) return null;
    return prisma.exerciseQuestion.findFirst({
      where,
      skip: Math.floor(Math.random() * total),
      include: { topic: { select: { subject: true, grade: true } } },
    });
  };

  let q = null;

  if (subjects.length > 0 && tierGrade !== null) {
    // 1st try: exact subject + grade
    q = await pickRandom({
      type: "mc",
      topic: { subject: { in: subjects }, grade: tierGrade },
    });
    // 2nd try: subject, any grade
    if (!q) {
      q = await pickRandom({ type: "mc", topic: { subject: { in: subjects } } });
    }
  } else if (subjects.length > 0) {
    q = await pickRandom({ type: "mc", topic: { subject: { in: subjects } } });
  }

  // Fallback: any MC question
  if (!q) q = await pickRandom({ type: "mc" });
  if (!q) return NextResponse.json({ error: "No questions available" }, { status: 404 });

  const opts = q.options ? (JSON.parse(q.options) as string[]) : [];

  return NextResponse.json({
    id: q.id,
    question: q.question,
    subject: q.topic.subject,
    grade: q.topic.grade,
    options: opts.map((text, i) => ({ id: i, text })),
  });
}
