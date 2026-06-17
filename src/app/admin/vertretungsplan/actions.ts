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

  const entry = await prisma.substitutionEntry.create({
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
    include: { class: { select: { name: true } } },
  });

  // Notify all students of the affected class
  const dateLabel = new Date(dateStr).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const typeLabel = type === "cancelled" ? "Ausfall" : "Vertretung";
  const subjectLabel = subjectName ? ` – ${subjectName}` : "";

  const students = await prisma.user.findMany({
    where: { classId, role: "student" },
    select: { id: true },
  });

  if (students.length > 0) {
    await prisma.appNotification.createMany({
      data: students.map((s) => ({
        userId: s.id,
        type: "substitution",
        title: `${typeLabel}${subjectLabel}`,
        body: `${entry.class.name} · ${period}. Stunde · ${dateLabel}`,
        linkUrl: "/app/plan",
      })),
    });
  }

  revalidatePath("/admin/vertretungsplan");
  revalidatePath("/app/plan");
}

export async function deleteSubstitution(id: string): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  await prisma.substitutionEntry.delete({ where: { id, schoolId: session.schoolId ?? "" } });

  revalidatePath("/admin/vertretungsplan");
  revalidatePath("/app/plan");
}
