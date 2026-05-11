"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export async function reportAbsence(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME["parent"]);
  if (!session.schoolId) return;

  const studentId = (formData.get("studentId") as string | null)?.trim() ?? "";
  const fromStr = (formData.get("from") as string | null)?.trim() ?? "";
  const toStr = (formData.get("to") as string | null)?.trim() ?? "";
  const reason = (formData.get("reason") as string | null)?.trim() || null;

  if (!studentId || !fromStr || !toStr) return;

  const link = await prisma.parentStudentLink.findFirst({
    where: { parentId: session.userId, studentId },
  });
  if (!link) return;

  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return;
  if (toDate < fromDate) return;

  await prisma.absence.create({
    data: {
      studentId,
      reporterId: session.userId,
      schoolId: session.schoolId,
      fromDate,
      toDate,
      reason,
    },
  });

  revalidatePath("/eltern/abwesenheit");
}
