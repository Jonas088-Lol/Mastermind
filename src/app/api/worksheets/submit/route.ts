/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { gradeSubmission } from "@/components/worksheet/GradingEngine";
import { incrementQuestProgress } from "@/lib/quests";
import { onExerciseComplete } from "@/lib/tree-quest-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubmitBody {
  assignmentId: string;
  answers: Record<string, string>;
  timeTakenSec: number;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  if (effectiveRole(session) !== "student") {
    return NextResponse.json({ error: "Nur für Schüler" }, { status: 403 });
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const { assignmentId, answers, timeTakenSec } = body;

  if (!assignmentId || typeof answers !== "object") {
    return NextResponse.json({ error: "assignmentId und answers erforderlich" }, { status: 400 });
  }

  const assignment = await prisma.worksheetAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      worksheet: {
        include: { items: true },
      },
      class: {
        include: { students: { select: { id: true } } },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Zuweisung nicht gefunden" }, { status: 404 });
  }

  const isInClass = assignment.class?.students.some((s) => s.id === session.userId) ?? false;
  if (!isInClass) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const existingCount = await prisma.worksheetSubmission.count({
    where: { assignmentId, studentId: session.userId },
  });
  if (existingCount >= assignment.maxAttempts) {
    return NextResponse.json({ error: "Maximale Versuche erreicht" }, { status: 409 });
  }

  const submission = await prisma.worksheetSubmission.create({
    data: {
      assignmentId,
      studentId: session.userId,
      timeTakenSec: typeof timeTakenSec === "number" ? timeTakenSec : null,
      status: "in_progress",
    },
  });

  const answersMap = new Map<string, string>(
    Object.entries(answers).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])
  );

  const { itemResults, totalScore, maxScore } = gradeSubmission(
    assignment.worksheet.items,
    answersMap
  );

  await prisma.worksheetItemAnswer.createMany({
    data: assignment.worksheet.items
      .filter((item) => answersMap.has(item.id))
      .map((item) => {
        const result = itemResults.get(item.id);
        return {
          submissionId: submission.id,
          itemId: item.id,
          answer: answersMap.get(item.id) ?? "null",
          isCorrect: result?.isCorrect ?? null,
          pointsEarned: result ? Math.round(result.pointsEarned) : null,
        };
      }),
  });

  const score = Math.round(totalScore);

  await prisma.worksheetSubmission.update({
    where: { id: submission.id },
    data: {
      score,
      maxScore: Math.round(maxScore),
      status: "submitted",
      submittedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: session.userId },
    data: { xp: { increment: score } },
  });

  await prisma.xpLog.create({
    data: {
      userId: session.userId,
      amount: score,
      reason: `Arbeitsblatt: ${assignment.worksheet.title}`,
      referenceId: submission.id,
    },
  });

  // Hook quest engine — worksheet submission counts as "submission" category
  // and grants tree progress proportional to score (1 point per 20% score)
  const treePoints = Math.max(1, Math.round(score / 20));
  void incrementQuestProgress(session.userId, "submission", 1).catch(() => undefined);
  void onExerciseComplete(session.userId, treePoints).catch(() => undefined);

  return NextResponse.json({ ok: true, score, maxScore: Math.round(maxScore), submissionId: submission.id });
}
