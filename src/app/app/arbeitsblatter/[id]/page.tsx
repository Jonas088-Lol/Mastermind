import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { WorksheetPlayerPage } from "./WorksheetPlayerPage";

export const metadata: Metadata = { title: "Arbeitsblatt" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorksheetAssignmentPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const { id } = await params;

  const assignment = await prisma.worksheetAssignment.findUnique({
    where: { id },
    include: {
      worksheet: {
        include: {
          subject: { select: { name: true } },
          items: { orderBy: { order: "asc" } },
        },
      },
      class: { select: { id: true, name: true } },
      submissions: {
        where: { studentId: session.userId },
        take: 1,
        orderBy: { startedAt: "desc" },
        include: { itemAnswers: true },
      },
    },
  });

  if (!assignment) notFound();

  // Verify the student's class matches this assignment
  if (assignment.classId && assignment.classId !== session.classId) {
    notFound();
  }

  const existingSubmission = assignment.submissions[0] ?? null;

  // If already submitted and maxAttempts reached, show already-submitted state
  const submissionCount = await prisma.worksheetSubmission.count({
    where: { assignmentId: id, studentId: session.userId },
  });

  if (
    submissionCount >= assignment.maxAttempts &&
    existingSubmission?.status !== "in_progress"
  ) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Arbeitsblatt
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {assignment.worksheet.title}
          </h1>
        </header>
        <div className="border border-border bg-bg p-8 text-center">
          <p className="text-lg font-semibold">Bereits abgegeben</p>
          {existingSubmission?.score !== null &&
            existingSubmission?.maxScore !== null &&
            existingSubmission?.score !== undefined &&
            existingSubmission?.maxScore !== undefined && (
              <p className="mt-2 text-muted-fg">
                Ergebnis:{" "}
                <span className="font-mono font-bold text-fg">
                  {existingSubmission.score}
                </span>{" "}
                / {existingSubmission.maxScore} Punkte (
                {Math.round(
                  (existingSubmission.score / existingSubmission.maxScore) * 100
                )}
                %)
              </p>
            )}
          <p className="mt-3 text-sm text-muted-fg">
            Du hast alle erlaubten Versuche aufgebraucht.
          </p>
        </div>
      </div>
    );
  }

  // Build existing answers map from submission item answers
  const existingAnswers: Record<string, string> | undefined =
    existingSubmission?.itemAnswers && existingSubmission.itemAnswers.length > 0
      ? Object.fromEntries(
          existingSubmission.itemAnswers.map((a) => [a.itemId, a.answer])
        )
      : undefined;

  const worksheetData = {
    id: assignment.worksheet.id,
    title: assignment.worksheet.title,
    description: assignment.worksheet.description,
    estimatedMinutes: assignment.worksheet.estimatedMinutes,
    difficulty: assignment.worksheet.difficulty,
    language: assignment.worksheet.language,
    items: assignment.worksheet.items.map((item) => ({
      id: item.id,
      type: item.type,
      order: item.order,
      config: item.config,
      correctAnswer: item.correctAnswer,
      hint: item.hint,
      points: item.points,
      required: item.required,
    })),
    assignment: {
      id: assignment.id,
      showHints: assignment.showHints,
      showSolution: assignment.showSolution,
      dueAt: assignment.dueAt ? assignment.dueAt.toISOString() : null,
      estimatedMinutes: assignment.worksheet.estimatedMinutes,
    },
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          {assignment.worksheet.subject?.name ?? "Arbeitsblatt"} ·{" "}
          {assignment.class?.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {assignment.worksheet.title}
        </h1>
        {assignment.worksheet.description && (
          <p className="mt-1 text-sm text-muted-fg">
            {assignment.worksheet.description}
          </p>
        )}
      </header>

      <WorksheetPlayerPage
        assignmentId={assignment.id}
        worksheet={worksheetData}
        existingAnswers={existingAnswers}
        showHints={assignment.showHints}
        showSolution={assignment.showSolution}
        estimatedMinutes={assignment.worksheet.estimatedMinutes}
      />
    </div>
  );
}
