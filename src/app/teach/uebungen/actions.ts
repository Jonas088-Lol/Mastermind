"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createTeacherExercise(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const classId = String(formData.get("classId") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!classId || !subject || !topic || !title) return;

  // Teacher must actually teach this class
  const teaches = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, classId },
    select: { id: true },
  });
  if (!teaches) return;

  await prisma.teacherExercise.create({
    data: { teacherId: session.userId, classId, subject, topic, title, description },
  });

  revalidatePath("/teach/uebungen");
  revalidatePath("/app/uebungen");
  revalidatePath("/eltern/uebungen");
}

export async function deleteTeacherExercise(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await prisma.teacherExercise.deleteMany({
    where: { id, teacherId: session.userId },
  });

  revalidatePath("/teach/uebungen");
  revalidatePath("/app/uebungen");
  revalidatePath("/eltern/uebungen");
}

export async function toggleExerciseDone(exerciseId: string, done: boolean) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  // Exercise must belong to the student's class
  const student = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { classId: true },
  });
  const exercise = await prisma.teacherExercise.findUnique({
    where: { id: exerciseId },
    select: { classId: true },
  });
  if (!student?.classId || exercise?.classId !== student.classId) return;

  if (done) {
    await prisma.teacherExerciseCompletion.upsert({
      where: { exerciseId_studentId: { exerciseId, studentId: session.userId } },
      create: { exerciseId, studentId: session.userId },
      update: {},
    });
  } else {
    await prisma.teacherExerciseCompletion.deleteMany({
      where: { exerciseId, studentId: session.userId },
    });
  }

  revalidatePath("/app/uebungen");
  revalidatePath("/eltern/uebungen");
}
