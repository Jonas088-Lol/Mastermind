"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (effectiveRole(session) !== "admin") return null;
  return session;
}

export async function createSubstitution(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  const dateStr = formData.get("date") as string;
  const period = parseInt(formData.get("period") as string, 10);
  const classId = formData.get("classId") as string;
  const absentTeacherId = (formData.get("absentTeacherId") as string) || null;
  const substituteTeacherId = (formData.get("substituteTeacherId") as string) || null;
  const subjectName = (formData.get("subjectName") as string) || null;
  const note = (formData.get("note") as string) || null;
  const type = (formData.get("type") as string) || "substitution";
  const room = (formData.get("room") as string) || null;

  if (!dateStr || !classId || isNaN(period)) return;

  await prisma.substitutionEntry.create({
    data: {
      schoolId: session.schoolId ?? "",
      date: new Date(dateStr),
      period,
      classId,
      absentTeacherId: absentTeacherId || undefined,
      substituteTeacherId: substituteTeacherId || undefined,
      subjectName: subjectName || undefined,
      note: note || undefined,
      type,
      room: room || undefined,
    },
  });

  revalidatePath("/admin/vertretungsplan");
}
