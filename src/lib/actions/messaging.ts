/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/security/rate-limit";

/** Maximale Nachrichtenlänge (Schutz vor riesigen Payloads). */
const MESSAGE_MAX_CHARS = 5000;

export async function sendMessage(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const threadId = String(formData.get("threadId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim().slice(0, MESSAGE_MAX_CHARS);
  const backHref = String(formData.get("backHref") ?? "/app/nachrichten");
  const replyToId = String(formData.get("replyToId") ?? "").trim() || null;

  if (!threadId || !content) return;

  // Spam-Schutz: max. 20 Nachrichten / Minute pro Nutzer.
  const rl = await rateLimit({ scope: "msg-send", key: session.userId, limit: 20, windowSec: 60 });
  if (!rl.ok) return;

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

  // Reply target must belong to the same thread
  let validReplyToId: string | null = null;
  if (replyToId) {
    const target = await prisma.message.findUnique({
      where: { id: replyToId },
      select: { threadId: true },
    });
    if (target?.threadId === threadId) validReplyToId = replyToId;
  }

  await prisma.$transaction([
    prisma.message.create({ data: { threadId, senderId: session.userId, content, replyToId: validReplyToId } }),
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
  // Revalidate layout badges for all roles so the unread count stays correct
  revalidatePath("/app", "layout");
  revalidatePath("/teach", "layout");
  revalidatePath("/eltern", "layout");
  revalidatePath("/admin", "layout");
}

export async function editThreadMessage(messageId: string, content: string) {
  const session = await getSession();
  if (!session) return;
  const trimmed = content.trim();
  if (!messageId || !trimmed) return;

  // Only the sender may edit their own message
  const msg = await prisma.message.updateMany({
    where: { id: messageId, senderId: session.userId },
    data: { content: trimmed, editedAt: new Date() },
  });
  if (msg.count === 0) return;

  revalidateMessagePages();
}

export async function deleteThreadMessage(messageId: string) {
  const session = await getSession();
  if (!session) return;
  if (!messageId) return;

  // Detach replies pointing at this message, then delete (sender only)
  const owned = await prisma.message.findFirst({
    where: { id: messageId, senderId: session.userId },
    select: { id: true },
  });
  if (!owned) return;

  await prisma.$transaction([
    prisma.message.updateMany({ where: { replyToId: messageId }, data: { replyToId: null } }),
    prisma.message.delete({ where: { id: messageId } }),
  ]);

  revalidateMessagePages();
}

/**
 * Meldet eine Nachricht an die Schul-Administration (Mobbing-/Missbrauchs-Schutz).
 * Erstellt eine Benachrichtigung an alle Admins/Rektoren der Schule. Rate-limitiert.
 */
export async function reportThreadMessage(messageId: string, reason?: string) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };
  if (!messageId) return { error: "Ungültig" };

  // Rate-Limit: max. 10 Meldungen / Stunde pro Nutzer (gegen Melde-Spam).
  const rl = await rateLimit({ scope: "msg-report", key: session.userId, limit: 10, windowSec: 3600 });
  if (!rl.ok) return { error: "Zu viele Meldungen. Bitte später erneut." };

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      content: true,
      sender: { select: { name: true } },
      thread: { select: { id: true, schoolId: true, participants: { select: { userId: true } } } },
    },
  });
  if (!message) return { error: "Nachricht nicht gefunden" };

  // Nur Teilnehmer des Threads dürfen melden.
  if (!message.thread.participants.some((p) => p.userId === session.userId)) {
    return { error: "Nicht berechtigt" };
  }

  const schoolId = message.thread.schoolId ?? session.schoolId;
  if (!schoolId) return { error: "Keine Schule" };

  const admins = await prisma.user.findMany({
    where: { schoolId, role: { in: ["admin", "rector", "vice_rector"] } },
    select: { id: true },
  });
  if (admins.length > 0) {
    const snippet = message.content.slice(0, 120);
    await prisma.appNotification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "system",
        title: "⚠ Gemeldete Nachricht",
        body: `${session.name} meldete eine Nachricht von ${message.sender.name}${reason ? ` (Grund: ${reason.slice(0, 80)})` : ""}: „${snippet}"`,
        linkUrl: `/admin/nachrichten/${message.thread.id}`,
      })),
    });
  }

  return { ok: true };
}

// Revalidate list pages + dynamic thread pages for all roles
function revalidateMessagePages() {
  for (const base of ["/app", "/teach", "/eltern", "/admin"]) {
    revalidatePath(`${base}/nachrichten`);
    revalidatePath(`${base}/nachrichten/[threadId]`, "page");
  }
}

export async function markThreadRead(threadId: string) {
  // Nur die eigene Teilnahme darf als gelesen markiert werden. Kein userId-
  // Parameter von außen — sonst könnte man fremde lastReadAt manipulieren (IDOR).
  const session = await getSession();
  if (!session) return;

  await prisma.messageParticipant
    .update({ where: { threadId_userId: { threadId, userId: session.userId } }, data: { lastReadAt: new Date() } })
    .catch(() => undefined);

  // Revalidate list pages AND their layout segments so the sidebar badge updates immediately
  revalidatePath("/app/nachrichten");
  revalidatePath("/teach/nachrichten");
  revalidatePath("/eltern/nachrichten");
  revalidatePath("/admin/nachrichten");
  revalidatePath("/app", "layout");
  revalidatePath("/teach", "layout");
  revalidatePath("/eltern", "layout");
  revalidatePath("/admin", "layout");
}
