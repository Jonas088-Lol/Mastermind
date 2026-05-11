"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function updateAttendance(
  recordId: string | null,
  lessonId: string,
  studentId: string,
  status: string
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

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
  if (!session) return;
  await prisma.lessonLog.update({
    where: { id: lessonId },
    data: { signedAt: new Date() },
  });
  revalidatePath("/teach/klassenbuch");
}

export async function createIncident(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const classId = String(formData.get("classId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();

  if (!classId || !studentId || !type || !text) {
    throw new Error("Alle Felder sind Pflicht");
  }

  await prisma.classbookIncident.create({
    data: {
      teacherId: session.userId,
      studentId,
      classId,
      type,
      text,
    },
  });

  revalidatePath("/teach/klassenbuch");
}
