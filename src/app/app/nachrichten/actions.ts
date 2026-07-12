/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function sendMessage(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const threadId = String(formData.get("threadId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim().slice(0, 5000);

  if (!threadId || !content) return;

  const participant = await prisma.messageParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: session.userId } },
  });
  if (!participant) return;

  await prisma.$transaction([
    prisma.message.create({
      data: { threadId, senderId: session.userId, content },
    }),
    prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    }),
  ]);

  // Notify other participants
  const others = await prisma.messageParticipant.findMany({
    where: { threadId, userId: { not: session.userId } },
    select: { userId: true },
  });
  const thread = await prisma.messageThread.findUnique({ where: { id: threadId }, select: { subject: true } });
  if (thread) {
    await prisma.appNotification.createMany({
      data: others.map((p) => ({
        userId: p.userId,
        type: "message",
        title: `Neue Nachricht`,
        body: `${session.name}: ${content.slice(0, 80)}`,
        linkUrl: `/nachrichten`,
      })),
    });
  }

  revalidatePath(`/app/nachrichten/${threadId}`);
  revalidatePath(`/teach/nachrichten/${threadId}`);
  revalidatePath(`/eltern/nachrichten/${threadId}`);
}

export async function markThreadRead(threadId: string) {
  const session = await getSession();
  if (!session) return;

  await prisma.messageParticipant.update({
    where: { threadId_userId: { threadId, userId: session.userId } },
    data: { lastReadAt: new Date() },
  }).catch(() => undefined);
}
