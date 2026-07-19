/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export async function createAdminThread(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "nachrichten")) redirect("/admin");

  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!recipientId || !subject || !content) return;
  if (!session.schoolId) return;

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { schoolId: true },
  });
  if (!recipient || recipient.schoolId !== session.schoolId) return;

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

  revalidatePath("/admin/nachrichten");
  redirect(`/admin/nachrichten/${thread.id}`);
}
