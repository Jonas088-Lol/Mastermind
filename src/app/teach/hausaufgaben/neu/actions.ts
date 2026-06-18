"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";

export async function createHomework(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const tscId = (formData.get("tscId") as string | null)?.trim() ?? "";
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const dueAtRaw = (formData.get("dueAt") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const requiresUpload = (formData.get("requiresUpload") as string | null) === "on";

  if (!tscId || !title || !dueAtRaw) return;

  const dueAt = new Date(dueAtRaw);
  if (isNaN(dueAt.getTime())) return;

  // Verify the teacher owns this subject-class combo
  const tsc = await prisma.teacherSubjectClass.findFirst({
    where: { id: tscId, teacherId: session.userId },
  });
  if (!tsc) return;

  const homework = await prisma.homework.create({
    data: {
      teacherId: session.userId,
      classId: tsc.classId,
      subjectId: tsc.subjectId,
      title,
      description,
      dueAt,
      requiresUpload,
    },
  });

  // Create completion records for all students in the class and collect their IDs
  const students = await prisma.user.findMany({
    where: { classId: tsc.classId, role: "student" },
    select: { id: true },
  });

  if (students.length > 0) {
    await prisma.homeworkCompletion.createMany({
      data: students.map((s) => ({
        homeworkId: homework.id,
        studentId: s.id,
      })),
    });

    const subject = await prisma.subject.findUnique({
      where: { id: tsc.subjectId },
      select: { name: true },
    });

    pushToUsers(
      students.map((s) => s.id),
      {
        title: "Neue Hausaufgabe",
        body: `${subject?.name ?? "Fach"}: ${title}`,
        url: "/app/hausaufgaben",
      }
    ).catch((err) => {
      logger.warn("hausaufgaben: push notification failed", { error: String(err) });
    });
  }

  revalidatePath("/teach/hausaufgaben");
  redirect("/teach/hausaufgaben");
}
