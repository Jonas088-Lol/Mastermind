/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { pushToUsers } from "@/lib/push";
import { effectiveRole, getSession } from "@/lib/session";

export async function updateAttendance(
  recordId: string | null,
  lessonId: string,
  studentId: string,
  status: string
) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") throw new Error("Unauthorized");

  // Verify teacher owns the lesson
  const lesson = await prisma.lessonLog.findUnique({
    where: { id: lessonId },
    select: { teacherId: true },
  });
  if (!lesson || lesson.teacherId !== session.userId) throw new Error("Unauthorized");

  if (recordId) {
    await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: { status },
    });
  } else {
    await prisma.attendanceRecord.create({
      data: {
        lessonId,
        studentId,
        teacherId: session.userId,
        date: new Date(),
        status,
      },
    });
  }
  revalidatePath("/teach/klassenbuch");
}

export async function signLesson(lessonId: string) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") return;

  // Verify teacher owns the lesson
  const lesson = await prisma.lessonLog.findUnique({
    where: { id: lessonId },
    select: { teacherId: true },
  });
  if (!lesson || lesson.teacherId !== session.userId) return;

  await prisma.lessonLog.update({
    where: { id: lessonId },
    data: { signedAt: new Date() },
  });
  revalidatePath("/teach/klassenbuch");
}

export async function createIncident(formData: FormData) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") throw new Error("Unauthorized");

  const classId = String(formData.get("classId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();

  if (!classId || !studentId || !type || !text) {
    throw new Error("Alle Felder sind Pflicht");
  }

  // Verify teacher teaches in this class
  const tsc = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, classId },
  });
  if (!tsc) throw new Error("Unauthorized");

  await prisma.classbookIncident.create({
    data: {
      teacherId: session.userId,
      studentId,
      classId,
      type,
      text,
    },
  });

  // Notify parents of the student when a Verweis (warning) is issued
  if (type === "Verweis") {
    const parentLinks = await prisma.parentStudentLink.findMany({
      where: { studentId },
      select: { parentId: true },
    });
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    if (parentLinks.length > 0) {
      const parentIds = parentLinks.map((l) => l.parentId);
      const body = `${student?.name ?? "Ihr Kind"} hat einen Verweis erhalten.`;
      await Promise.all([
        pushToUsers(parentIds, {
          title: "Verweis eingetragen",
          body,
          url: "/eltern",
        }).catch((err) => { logger.warn("klassenbuch: push failed", { error: String(err) }); }),
        prisma.appNotification.createMany({
          data: parentIds.map((userId) => ({
            userId,
            type: "warning",
            title: "Verweis eingetragen",
            body,
          })),
        }),
      ]);
    }
  }

  revalidatePath("/teach/klassenbuch");
}

export async function deleteIncident(incidentId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const incident = await prisma.classbookIncident.findUnique({
    where: { id: incidentId },
    select: { teacherId: true },
  });
  if (!incident || incident.teacherId !== session.userId) return;

  await prisma.classbookIncident.delete({ where: { id: incidentId } });
  revalidatePath("/teach/klassenbuch");
}
