/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { MarkReadOnMount } from "@/components/app/MarkReadOnMount";
import { ThreadMessages, type ThreadMsg } from "@/components/app/ThreadMessages";

interface Props {
  params: Promise<{ threadId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { threadId } = await params;
  const thread = await prisma.messageThread.findUnique({ where: { id: threadId }, select: { subject: true } });
  return { title: thread?.subject ?? "Nachricht" };
}

export default async function AdminThreadPage({ params }: Props) {
  const { threadId } = await params;
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");

  const participant = await prisma.messageParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: session.userId } },
  });
  if (!participant) notFound();

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        include: {
          sender: { select: { id: true, name: true } },
          replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
        },
        orderBy: { sentAt: "asc" },
      },
      participants: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!thread) notFound();

  const messages: ThreadMsg[] = thread.messages.map((m) => ({
    id: m.id,
    content: m.content,
    senderId: m.sender.id,
    senderName: m.sender.name,
    sentAt: m.sentAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    replyTo: m.replyTo
      ? { id: m.replyTo.id, content: m.replyTo.content, senderName: m.replyTo.sender.name }
      : null,
  }));

  return (
    <>
      <MarkReadOnMount threadId={threadId} />
      <div className="mx-auto flex max-w-4xl flex-col">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg px-5 py-4">
          <Link href="/admin/nachrichten" className="text-muted-fg hover:text-fg">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{thread.subject}</p>
            <p className="text-xs text-muted-fg truncate">
              {thread.participants.map((p) => p.user.name).join(", ")}
            </p>
          </div>
        </div>

        <ThreadMessages
          threadId={threadId}
          backHref={`/admin/nachrichten/${threadId}`}
          myId={session.userId}
          messages={messages}
        />
      </div>
    </>
  );
}
