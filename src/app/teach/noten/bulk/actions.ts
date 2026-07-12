/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";

export async function saveBulkGrades(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const subjectId = formData.get("subjectId") as string;
  const classId = formData.get("classId") as string;
  const gradeType = (formData.get("gradeType") as string) || "test";
  const topic = (formData.get("topic") as string | null)?.trim() || null;
  const dateStr = formData.get("date") as string;
  const date = dateStr ? new Date(dateStr) : new Date();

  if (!subjectId || !classId) return;

  // Verify this teacher teaches this subject in this class
  const tsc = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, subjectId, classId },
  });
  if (!tsc) return;

  // Load valid student IDs for this class to avoid grading arbitrary users
  const classStudents = await prisma.user.findMany({
    where: { classId, role: "student" },
    select: { id: true },
  });
  const validStudentIds = new Set(classStudents.map((s) => s.id));

  // Collect all grade entries: grade_<studentId> = value
  const entries: Array<{ studentId: string; value: number }> = [];
  for (const [key, val] of formData.entries()) {
    if (key.startsWith("grade_") && val && val !== "") {
      const studentId = key.replace("grade_", "");
      if (!validStudentIds.has(studentId)) continue;
      const value = parseFloat(val as string);
      if (!isNaN(value) && value >= 1 && value <= 6) {
        entries.push({ studentId, value });
      }
    }
  }

  if (entries.length === 0) return;

  const createdGrades = await prisma.$transaction(
    entries.map(({ studentId, value }) =>
      prisma.grade.create({
        data: {
          studentId,
          subjectId,
          teacherId: session.userId,
          value,
          weight: 1.0,
          type: gradeType,
          topic,
          date,
          comment: null,
        },
        select: { id: true, studentId: true },
      })
    )
  );

  for (const g of createdGrades) {
    awardXp(g.studentId, "aufgabe_bewertet", g.id).catch(() => undefined);
  }

  revalidatePath("/teach/noten");
  redirect("/teach/noten");
}
