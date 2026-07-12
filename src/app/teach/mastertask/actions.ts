/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createMasterTask(formData: FormData) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const dueAtRaw = String(formData.get("dueAt") ?? "").trim();
  const classId = String(formData.get("classId") ?? "").trim();
  const bookName = String(formData.get("bookName") ?? "").trim() || null;
  const bookPageFromRaw = String(formData.get("bookPageFrom") ?? "").trim();
  const bookPageToRaw = String(formData.get("bookPageTo") ?? "").trim();
  const exerciseNr = String(formData.get("exerciseNr") ?? "").trim() || null;

  if (!title || !classId) return;

  // Verify teacher has this class
  const tsc = await prisma.teacherSubjectClass.findFirst({
    where: { teacherId: session.userId, classId },
  });
  if (!tsc) return;

  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { schoolId: true },
  });
  if (!schoolClass) return;

  // Ungültige Datums-/Zahleneingaben dürfen nicht an Prisma gehen (DateTime?/Int?
  // crashen bei Invalid Date bzw. NaN) — bei ungültiger Eingabe auf null fallen.
  const dueAtParsed = dueAtRaw ? new Date(dueAtRaw) : null;
  const dueAt = dueAtParsed && !isNaN(dueAtParsed.getTime()) ? dueAtParsed : null;
  const bookPageFromParsed = bookPageFromRaw ? parseInt(bookPageFromRaw, 10) : null;
  const bookPageFrom = bookPageFromParsed !== null && !isNaN(bookPageFromParsed) ? bookPageFromParsed : null;
  const bookPageToParsed = bookPageToRaw ? parseInt(bookPageToRaw, 10) : null;
  const bookPageTo = bookPageToParsed !== null && !isNaN(bookPageToParsed) ? bookPageToParsed : null;

  const task = await prisma.masterTask.create({
    data: {
      title,
      description,
      subject,
      dueAt,
      classId,
      teacherId: session.userId,
      schoolId: schoolClass.schoolId,
      bookName,
      bookPageFrom,
      bookPageTo,
      exerciseNr,
    },
  });

  revalidatePath("/teach/mastertask");
  redirect(`/teach/mastertask/${task.id}`);
}

export async function deleteMasterTask(id: string) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") return;

  const task = await prisma.masterTask.findUnique({ where: { id } });
  if (!task || task.teacherId !== session.userId) return;

  await prisma.masterTask.delete({ where: { id } });
  revalidatePath("/teach/mastertask");
  redirect("/teach/mastertask");
}

export async function deleteMasterTaskFile(fileId: string, taskId: string) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") return;

  const file = await prisma.masterTaskFile.findUnique({
    where: { id: fileId },
    include: { task: { select: { teacherId: true } } },
  });
  if (!file || file.task.teacherId !== session.userId) return;

  await prisma.masterTaskFile.delete({ where: { id: fileId } });
  revalidatePath(`/teach/mastertask/${taskId}`);
}
