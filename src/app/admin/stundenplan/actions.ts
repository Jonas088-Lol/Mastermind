"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function savePeriodConfig(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const ops = [];
  for (let p = 1; p <= 9; p++) {
    const start = (formData.get(`start_${p}`) as string | null)?.trim();
    const end = (formData.get(`end_${p}`) as string | null)?.trim();
    if (!start || !end) continue;
    ops.push(
      prisma.schoolPeriodConfig.upsert({
        where: { schoolId_period: { schoolId: session.schoolId, period: p } },
        update: { startTime: start, endTime: end },
        create: { schoolId: session.schoolId, period: p, startTime: start, endTime: end },
      })
    );
  }
  await prisma.$transaction(ops);
  revalidatePath("/admin/stundenplan");
  revalidatePath("/teach");
}

export async function saveTimetableEntry(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const classId = formData.get("classId") as string;
  const teacherId = formData.get("teacherId") as string;
  const subjectId = formData.get("subjectId") as string;
  const day = parseInt(formData.get("day") as string, 10);
  const period = parseInt(formData.get("period") as string, 10);
  const room = (formData.get("room") as string | null)?.trim() || null;

  if (!classId || !teacherId || !subjectId || !day || !period) return;

  await prisma.timetableEntry.upsert({
    where: { classId_day_period: { classId, day, period } },
    update: { teacherId, subjectId, room },
    create: { schoolId: session.schoolId, classId, teacherId, subjectId, day, period, room },
  });

  revalidatePath("/admin/stundenplan");
  revalidatePath("/teach");
}

export async function deleteTimetableEntry(entryId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;
  await prisma.timetableEntry.delete({ where: { id: entryId } });
  revalidatePath("/admin/stundenplan");
}
