"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { logger } from "@/lib/logger";
import { pushToUsers } from "@/lib/push";
import { awardXp } from "@/lib/xp";

export async function saveGrade(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") return;

  const studentId = (formData.get("studentId") as string | null)?.trim() ?? "";
  const subjectId = (formData.get("subjectId") as string | null)?.trim() ?? "";
  const classSlug = (formData.get("classSlug") as string | null)?.trim() ?? "";
  const rawValue = (formData.get("value") as string | null)?.trim() ?? "";
  const type = (formData.get("type") as string | null)?.trim() ?? "test";
  const comment = (formData.get("comment") as string | null)?.trim() || null;
  const dateStr = (formData.get("date") as string | null)?.trim() ?? "";

  if (!studentId || !subjectId || !rawValue) return;

  const value = parseFloat(rawValue);
  if (isNaN(value) || value < 1 || value > 6) return;

  const date = dateStr ? new Date(dateStr) : new Date();

  // Verify the student belongs to a class the teacher teaches this subject in
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { schoolId: true, classId: true, role: true },
  });
  if (!student || student.schoolId !== session.schoolId || student.role !== "student") return;

  if (student.classId) {
    const tsc = await prisma.teacherSubjectClass.findFirst({
      where: { teacherId: session.userId, subjectId, classId: student.classId },
    });
    if (!tsc) return;
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { name: true },
  });

  const grade = await prisma.grade.create({
    data: {
      studentId,
      teacherId: session.userId,
      subjectId,
      value,
      weight: 1.0,
      type,
      comment,
      date,
    },
    select: { id: true },
  });

  const gradeLabel = value.toFixed(1).replace(".", ",");
  const subjectName = subject?.name ?? "Fach";
  await Promise.all([
    pushToUsers([studentId], {
      title: "Neue Note eingetragen",
      body: `${subjectName}: ${gradeLabel}`,
      url: "/app/noten",
    }).catch((err) => { logger.warn("noten: push failed", { error: String(err) }); }),
    prisma.appNotification.create({
      data: {
        userId: studentId,
        type: "grade",
        title: "Neue Note eingetragen",
        body: `${subjectName}: ${gradeLabel}`,
      },
    }),
    awardXp(studentId, "aufgabe_bewertet", grade.id),
  ]);

  revalidatePath(`/teach/klassen/${classSlug}`);
  redirect(`/teach/klassen/${classSlug}`);
}
