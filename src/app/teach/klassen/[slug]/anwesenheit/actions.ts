"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function saveBulkAttendance(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") return;

  const classId = (formData.get("classId") as string | null)?.trim() ?? "";
  const classSlug = (formData.get("classSlug") as string | null)?.trim() ?? "";
  const dateStr = (formData.get("date") as string | null)?.trim() ?? "";
  if (!classId || !dateStr) return;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return;

  // Verify teacher teaches this class
  const tsc = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, classId },
  });
  if (!tsc) return;

  // Get the valid student roster for this class
  const classStudents = await prisma.user.findMany({
    where: { classId, role: "student" },
    select: { id: true },
  });
  const validStudentIds = new Set(classStudents.map((s) => s.id));

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  // Collect all student statuses from form, only for valid class members
  const studentIds = (formData.getAll("studentId") as string[]).filter((id) => validStudentIds.has(id));
  if (studentIds.length === 0) return;

  // Delete existing standalone records for this day (lessonId = null)
  await prisma.attendanceRecord.deleteMany({
    where: {
      studentId: { in: studentIds },
      lessonId: null,
      date: { gte: dayStart, lt: dayEnd },
    },
  });

  // Create new records
  const records = studentIds.map((studentId) => {
    const status = (formData.get(`status_${studentId}`) as string | null) ?? "anwesend";
    const reason = (formData.get(`reason_${studentId}`) as string | null)?.trim() || null;
    return {
      studentId,
      teacherId: session.userId,
      date,
      status,
      reason,
      lessonId: null,
    };
  });

  await prisma.attendanceRecord.createMany({ data: records });

  revalidatePath(`/teach/klassen/${classSlug}`);
  redirect(`/teach/klassen/${classSlug}`);
}
