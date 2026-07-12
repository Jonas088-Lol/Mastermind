/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createThread(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const content = String(formData.get("content") ?? "").trim().slice(0, 5000);

  if (!recipientId || !subject || !content) return;
  if (!session.schoolId) redirect("/app/nachrichten");

  const senderRole = effectiveRole(session);
  const allowedRoles: string[] =
    senderRole === "student"
      ? ["teacher"]
      : senderRole === "parent"
      ? ["teacher", "admin"]
      : ["student", "teacher", "parent", "admin"];

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { role: true, schoolId: true },
  });

  if (!recipient || !allowedRoles.includes(recipient.role)) {
    return;
  }
  if (recipient.schoolId !== session.schoolId) {
    return;
  }

  const thread = await prisma.messageThread.create({
    data: {
      subject,
      schoolId: session.schoolId,
    },
  });

  await prisma.messageParticipant.createMany({
    data: [
      { threadId: thread.id, userId: session.userId },
      { threadId: thread.id, userId: recipientId },
    ],
  });

  await prisma.message.create({
    data: {
      threadId: thread.id,
      senderId: session.userId,
      content,
    },
  });

  revalidatePath("/app/nachrichten");
  redirect(`/app/nachrichten/${thread.id}`);
}
