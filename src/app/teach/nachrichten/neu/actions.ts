/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";
import { can } from "@/lib/permissions";

export async function createThread(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/teach");

  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const classId = String(formData.get("classId") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!subject || !content) return;
  if (!recipientId && !classId) return;
  if (!session.schoolId) redirect("/teach/nachrichten");

  // Empfänger bestimmen: entweder eine Person oder eine ganze Klasse.
  let recipientIds: string[] = [];

  if (classId) {
    // Von der Schulleitung sperrbar
    if (!(await can(session, "teacher.class_message"))) return;
    // Nur an Klassen, die die Lehrkraft auch unterrichtet.
    const teaches = await prisma.teacherSubjectClass.findFirst({
      where: { teacherId: session.userId, classId },
      select: { id: true },
    });
    if (!teaches) return;

    const klass = await prisma.schoolClass.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    });
    if (!klass || klass.schoolId !== session.schoolId) return;

    const students = await prisma.user.findMany({
      where: { classId, role: "student", schoolId: session.schoolId },
      select: { id: true },
    });
    recipientIds = students.map((s) => s.id);
    if (recipientIds.length === 0) return;
  } else {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { schoolId: true },
    });
    if (!recipient || recipient.schoolId !== session.schoolId) return;
    recipientIds = [recipientId];
  }

  const thread = await prisma.messageThread.create({
    data: { subject, schoolId: session.schoolId },
  });

  await prisma.messageParticipant.createMany({
    data: [
      { threadId: thread.id, userId: session.userId },
      ...recipientIds.map((userId) => ({ threadId: thread.id, userId })),
    ],
  });

  await prisma.message.create({
    data: { threadId: thread.id, senderId: session.userId, content },
  });

  // In-App-Hinweis + echte Push-Benachrichtigung für alle Empfänger.
  await prisma.appNotification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      type: "message",
      title: "Neue Nachricht",
      body: `${session.name}: ${content.slice(0, 80)}`,
      linkUrl: "/app/nachrichten",
    })),
  });

  pushToUsers(recipientIds, {
    title: "Neue Nachricht",
    body: `${session.name}: ${content.slice(0, 80)}`,
    url: "/app/nachrichten",
    data: { type: "message", threadId: thread.id },
    category: "message_reply",
  }).catch(() => undefined);

  revalidatePath("/teach/nachrichten");
  revalidatePath("/app", "layout");
  redirect(`/teach/nachrichten/${thread.id}`);
}
