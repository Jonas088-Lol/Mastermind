"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function sendMessage(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const threadId = String(formData.get("threadId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const backHref = String(formData.get("backHref") ?? "/app/nachrichten");

  if (!threadId || !content) return;

  const participant = await prisma.messageParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: session.userId } },
  });
  if (!participant) return;

  // Verify thread belongs to sender's school
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: { schoolId: true },
  });
  if (!thread) return;
  if (session.schoolId && thread.schoolId && thread.schoolId !== session.schoolId) return;

  await prisma.$transaction([
    prisma.message.create({ data: { threadId, senderId: session.userId, content } }),
    prisma.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } }),
  ]);

  const others = await prisma.messageParticipant.findMany({
    where: { threadId, userId: { not: session.userId } },
    select: { userId: true },
  });

  if (others.length > 0) {
    await prisma.appNotification.createMany({
      data: others.map((p) => ({
        userId: p.userId,
        type: "message",
        title: "Neue Nachricht",
        body: `${session.name}: ${content.slice(0, 80)}`,
        linkUrl: backHref.replace(/\/[^/]+$/, ""),
      })),
    });
  }

  revalidatePath(backHref);
}

export async function markThreadRead(threadId: string, userId: string) {
  await prisma.messageParticipant
    .update({ where: { threadId_userId: { threadId, userId } }, data: { lastReadAt: new Date() } })
    .catch(() => undefined);
}
