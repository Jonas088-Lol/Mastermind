"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function saveBulkGrades(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const subjectId = formData.get("subjectId") as string;
  const classId = formData.get("classId") as string;
  const gradeType = (formData.get("gradeType") as string) || "test";
  const dateStr = formData.get("date") as string;
  const date = dateStr ? new Date(dateStr) : new Date();

  // Collect all grade entries: grade_<studentId> = value
  const entries: Array<{ studentId: string; value: number }> = [];
  for (const [key, val] of formData.entries()) {
    if (key.startsWith("grade_") && val && val !== "") {
      const studentId = key.replace("grade_", "");
      const value = parseFloat(val as string);
      if (!isNaN(value) && value >= 1 && value <= 6) {
        entries.push({ studentId, value });
      }
    }
  }

  if (entries.length === 0) return;

  await prisma.$transaction(
    entries.map(({ studentId, value }) =>
      prisma.grade.create({
        data: {
          studentId,
          subjectId,
          teacherId: session.userId,
          value,
          weight: 1.0,
          type: gradeType,
          date,
          comment: null,
        },
      })
    )
  );

  revalidatePath("/teach/noten");
  redirect("/teach/noten");
}
