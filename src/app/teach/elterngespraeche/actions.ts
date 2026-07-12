/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createMeetingNote(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (effectiveRole(session) !== "teacher") return;

  const studentId = String(formData.get("studentId") ?? "").trim();
  const parentName = String(formData.get("parentName") ?? "").trim();
  const meetingAtRaw = String(formData.get("meetingAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const followUp = String(formData.get("followUp") ?? "").trim();

  if (!studentId || !meetingAtRaw || !notes) return;

  const meetingAt = new Date(meetingAtRaw);
  if (isNaN(meetingAt.getTime())) return;

  // Verify student is in one of teacher's classes
  const tsc = await prisma.teacherSubjectClass.findFirst({
    where: {
      teacherId: session.userId,
      class: { students: { some: { id: studentId } } },
    },
  });
  if (!tsc) return;

  await prisma.teacherMeetingNote.create({
    data: {
      teacherId: session.userId,
      studentId,
      parentName: parentName || null,
      meetingAt,
      notes,
      followUp: followUp || null,
    },
  });

  revalidatePath("/teach/elterngespraeche");
}

export async function deleteMeetingNote(noteId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (effectiveRole(session) !== "teacher") return;

  const note = await prisma.teacherMeetingNote.findUnique({
    where: { id: noteId },
    select: { teacherId: true },
  });
  if (!note || note.teacherId !== session.userId) return;

  await prisma.teacherMeetingNote.delete({ where: { id: noteId } });
  revalidatePath("/teach/elterngespraeche");
}
