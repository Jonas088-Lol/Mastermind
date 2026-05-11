"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";

export async function acceptSubmission(submissionId: string, grade: number) {
  const session = await getSession();
  if (!session) return;

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { select: { subjectId: true, teacherId: true } } },
  });
  if (!sub) return;

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
    },
    update: { value: grade },
  });
  await awardXp(sub.studentId, "aufgabe_bewertet", submissionId);
  revalidatePath("/teach/korrektur");
}

export async function openSubmission(submissionId: string) {
  // Mark as "submitted" so teacher can review
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "submitted" },
  });
  revalidatePath("/teach/korrektur");
}
