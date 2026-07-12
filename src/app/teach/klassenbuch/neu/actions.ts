/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createLesson(formData: FormData) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") throw new Error("Unauthorized");

  const classId = String(formData.get("classId") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const homework = String(formData.get("homework") ?? "").trim() || null;
  const dateStr = String(formData.get("date") ?? "").trim();

  if (!classId || !subjectId || !period || !topic) {
    throw new Error("Klasse, Fach, Stunde und Thema sind Pflicht");
  }

  // Verify teacher teaches this subject in this class
  const tsc = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, classId, subjectId },
  });
  if (!tsc) throw new Error("Unauthorized");

  // Ungültige Datumseingabe darf keine "Invalid Date" an Prisma (DateTime) geben
  // und würde sonst auch lesson.date.toISOString() im Redirect crashen.
  const parsedDate = dateStr ? new Date(dateStr) : new Date();
  const lessonDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

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
