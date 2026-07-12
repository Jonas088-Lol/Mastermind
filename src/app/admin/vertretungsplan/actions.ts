/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function cancelTeacherDay(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;
  const schoolId = session.schoolId ?? "";

  const teacherId = ((formData.get("teacherId") as string) || "").trim().slice(0, 64);
  const dateStr = ((formData.get("date") as string) || "").trim().slice(0, 10);
  if (!teacherId || !dateStr) return;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return;
  date.setHours(0, 0, 0, 0);

  // JS: 0=So … 6=Sa; TimetableEntry.day: 1=Mo … 5=Fr
  const day = date.getDay();
  if (day < 1 || day > 5) {
    redirect(`/admin/vertretungsplan?date=${dateStr}&done=0`);
  }

  const dayStart = new Date(date);
  const dayEnd = new Date(date.getTime() + 86399999);

  const [lessons, existing] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: { schoolId, teacherId, day },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { name: true } },
      },
    }),
    prisma.substitutionEntry.findMany({
      where: { schoolId, date: { gte: dayStart, lte: dayEnd } },
      select: { classId: true, period: true },
    }),
  ]);

  const taken = new Set(existing.map((e) => `${e.classId}:${e.period}`));
  const toCreate = lessons.filter((l) => !taken.has(`${l.classId}:${l.period}`));

  if (toCreate.length > 0) {
    await prisma.substitutionEntry.createMany({
      data: toCreate.map((l) => ({
        schoolId,
        date,
        period: l.period,
        classId: l.classId,
        absentTeacherId: teacherId,
        subjectName: l.subject.name,
        room: l.room ?? undefined,
        type: "cancellation",
      })),
    });
  }

  revalidatePath("/admin/vertretungsplan");
  revalidatePath("/app/plan");
  redirect(`/admin/vertretungsplan?date=${dateStr}&done=${toCreate.length}`);
}

export async function copyFromYesterday(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;
  const schoolId = session.schoolId ?? "";

  const dateStr = ((formData.get("date") as string) || "").trim().slice(0, 10);
  if (!dateStr) return;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return;
  date.setHours(0, 0, 0, 0);

  const prevStart = new Date(date);
  prevStart.setDate(prevStart.getDate() - 1);
  const prevEnd = new Date(prevStart.getTime() + 86399999);

  const dayEnd = new Date(date.getTime() + 86399999);

  const [source, existing] = await Promise.all([
    prisma.substitutionEntry.findMany({
      where: { schoolId, date: { gte: prevStart, lte: prevEnd } },
    }),
    prisma.substitutionEntry.findMany({
      where: { schoolId, date: { gte: date, lte: dayEnd } },
      select: { classId: true, period: true },
    }),
  ]);

  const taken = new Set(existing.map((e) => `${e.classId}:${e.period}`));
  const toCreate = source.filter((e) => !taken.has(`${e.classId}:${e.period}`));

  if (toCreate.length > 0) {
    await prisma.substitutionEntry.createMany({
      data: toCreate.map((e) => ({
        schoolId,
        date,
        period: e.period,
        classId: e.classId,
        absentTeacherId: e.absentTeacherId ?? undefined,
        substituteTeacherId: e.substituteTeacherId ?? undefined,
        subjectName: e.subjectName ?? undefined,
        note: e.note ?? undefined,
        type: e.type,
        room: e.room ?? undefined,
      })),
    });
  }

  revalidatePath("/admin/vertretungsplan");
  revalidatePath("/app/plan");
  redirect(`/admin/vertretungsplan?date=${dateStr}&done=${toCreate.length}`);
}

export async function deleteSubstitution(id: string): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  await prisma.substitutionEntry.delete({ where: { id, schoolId: session.schoolId ?? "" } });

  revalidatePath("/admin/vertretungsplan");
  revalidatePath("/app/plan");
}
