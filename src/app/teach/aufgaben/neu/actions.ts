"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";

export async function createAssignment(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const classId = (formData.get("classId") as string | null)?.trim() ?? "";
  const subjectId = (formData.get("subjectId") as string | null)?.trim() ?? "";
  const type = (formData.get("type") as string | null)?.trim() || "homework";
  const dueAtRaw = (formData.get("dueAt") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const maxPointsRaw = (formData.get("maxPoints") as string | null)?.trim() ?? "";

  if (!title || !classId || !subjectId || !dueAtRaw) return;

  const dueAt = new Date(dueAtRaw);
  if (isNaN(dueAt.getTime())) return;

  const maxPoints = maxPointsRaw ? parseInt(maxPointsRaw, 10) : null;

  // Verify teacher owns this class assignment right
  const tsc = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, classId, subjectId },
  });
  if (!tsc) return;

  const assignment = await prisma.assignment.create({
    data: {
      title,
      description,
      dueAt,
      type,
      maxPoints: maxPoints && !isNaN(maxPoints) ? maxPoints : null,
      teacherId: session.userId,
      classId,
      subjectId,
    },
  });

  // Create open submissions for all students in the class
  const students = await prisma.user.findMany({
    where: { classId, role: "student" },
    select: { id: true },
  });

  if (students.length > 0) {
    await prisma.submission.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        assignmentId: assignment.id,
        status: "open",
      })),
    });

    // Notify students
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { name: true },
    });
    pushToUsers(
      students.map((s) => s.id),
      { title: "Neue Aufgabe", body: `${subject?.name ?? "Fach"}: ${title}`, url: "/app/aufgaben" }
    ).catch((err) => {
      logger.warn("aufgaben: push notification failed", { error: String(err) });
    });
  }

  revalidatePath("/teach/aufgaben");
  redirect("/teach/aufgaben");
}
