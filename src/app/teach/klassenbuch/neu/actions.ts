"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function createLesson(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const classId = String(formData.get("classId") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const homework = String(formData.get("homework") ?? "").trim() || null;
  const dateStr = String(formData.get("date") ?? "").trim();

  if (!classId || !subjectId || !period || !topic) {
    throw new Error("Klasse, Fach, Stunde und Thema sind Pflicht");
  }

  const lessonDate = dateStr ? new Date(dateStr) : new Date();

  // Fetch students of the class
  const students = await prisma.user.findMany({
    where: { classId, role: "student" },
    select: { id: true },
  });

  const lesson = await prisma.lessonLog.create({
    data: {
      teacherId: session.userId,
      classId,
      subjectId,
      period,
      topic,
      homework,
      date: lessonDate,
      attendanceRecords: {
        create: students.map((s) => ({
          studentId: s.id,
          teacherId: session.userId,
          date: lessonDate,
          status: "anwesend",
        })),
      },
    },
  });

  revalidatePath("/teach/klassenbuch");
  redirect(`/teach/klassenbuch?date=${lesson.date.toISOString().slice(0, 10)}`);
}
