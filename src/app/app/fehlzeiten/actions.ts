"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function reportStudentAbsence(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") return;
  if (!session.schoolId) return;

  const from = (formData.get("from") as string | null)?.trim() ?? "";
  const to = (formData.get("to") as string | null)?.trim() ?? "";
  const reason = (formData.get("reason") as string | null)?.trim() || null;

  if (!from || !to) return;

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return;
  if (toDate < fromDate) return;

  await prisma.absence.create({
    data: {
      studentId: session.userId,
      reporterId: session.userId,
      schoolId: session.schoolId,
      fromDate,
      toDate,
      reason,
    },
  });

  revalidatePath("/app/fehlzeiten");
}
