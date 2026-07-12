/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";
import { pushToUsers } from "@/lib/push";

export async function acceptSubmission(submissionId: string, grade: number, comment?: string) {
  const session = await getSession();
  if (!session) return;

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { select: { subjectId: true, teacherId: true, title: true } } },
  });
  if (!sub || sub.assignment.teacherId !== session.userId) return;

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "graded" },
  });

  await prisma.grade.upsert({
    where: { submissionId: submissionId },
    create: {
      studentId: sub.studentId,
      teacherId: session.userId,
      subjectId: sub.assignment.subjectId,
      submissionId: submissionId,
      value: grade,
      type: "test",
      comment: comment ?? null,
    },
    update: { value: grade, comment: comment ?? null },
  });
  await awardXp(sub.studentId, "aufgabe_bewertet", submissionId);

  const gradeLabel = grade.toFixed(1).replace(".", ",");
  const assignmentTitle = sub.assignment.title ?? "Aufgabe";
  await Promise.all([
    pushToUsers([sub.studentId], {
      title: "Aufgabe bewertet",
      body: `${assignmentTitle} · Note ${gradeLabel}`,
      url: `/app/aufgaben/${sub.assignmentId}`,
    }),
    prisma.appNotification.create({
      data: {
        userId: sub.studentId,
        type: "grade",
        title: "Aufgabe bewertet",
        body: `${assignmentTitle} · Note ${gradeLabel}`,
      },
    }),
  ]);

  revalidatePath("/teach/korrektur");
  revalidatePath(`/teach/korrektur/${submissionId}`);
}

export async function openSubmission(submissionId: string) {
  // Mark as "submitted" so teacher can review
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "submitted" },
  });
  revalidatePath("/teach/korrektur");
}
