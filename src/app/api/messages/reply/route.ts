/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { pushToUsers } from "@/lib/push";

export const runtime = "nodejs";

const MESSAGE_MAX_CHARS = 5000;

/**
 * Direkt-Antwort auf einen Nachrichten-Thread — wird von der App aufgerufen,
 * wenn der Nutzer aus der Push-Benachrichtigung (oder Apple Watch) antwortet.
 * Spiegelt die Logik von sendMessage(), nur als JSON-Endpoint.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { threadId?: string; content?: string };
  const threadId = String(body.threadId ?? "").trim();
  const content = String(body.content ?? "").trim().slice(0, MESSAGE_MAX_CHARS);
  if (!threadId || !content) {
    return NextResponse.json({ error: "threadId und content erforderlich" }, { status: 400 });
  }

  const rl = await rateLimit({ scope: "msg-send", key: session.userId, limit: 20, windowSec: 60 });
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // Teilnahme + Schul-Zugehörigkeit prüfen (wie in sendMessage).
  const participant = await prisma.messageParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: session.userId } },
  });
  if (!participant) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: { schoolId: true },
  });
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.schoolId && thread.schoolId && thread.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.message.create({ data: { threadId, senderId: session.userId, content } }),
    prisma.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } }),
  ]);

  const others = await prisma.messageParticipant.findMany({
    where: { threadId, userId: { not: session.userId } },
    select: { userId: true },
  });

  if (others.length > 0) {
    const linkUrl = "/app/nachrichten";
    await prisma.appNotification.createMany({
      data: others.map((p) => ({
        userId: p.userId,
        type: "message",
        title: "Neue Nachricht",
        body: `${session.name}: ${content.slice(0, 80)}`,
        linkUrl,
      })),
    });
    pushToUsers(
      others.map((p) => p.userId),
      {
        title: "Neue Nachricht",
        body: `${session.name}: ${content.slice(0, 80)}`,
        url: linkUrl,
        data: { type: "message", threadId },
        category: "message_reply",
      },
    ).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
