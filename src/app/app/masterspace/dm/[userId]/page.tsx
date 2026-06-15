import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { DmBox } from "./DmBox";

export const metadata: Metadata = { title: "Direktnachricht · MasterSpace" };

export default async function DmPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { userId: recipientId } = await params;
  if (recipientId === session.userId) redirect("/app/masterspace");

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, name: true },
  });
  if (!recipient) notFound();

  const [a, b] = [session.userId, recipientId].sort();
  const conversation = await prisma.directConversation.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    include: {
      messages: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { sentAt: "asc" },
        take: 100,
      },
    },
  });

  const messages = conversation?.messages ?? [];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border border-border lg:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Link href="/app/masterspace" className="rounded p-1 hover:bg-muted">
          <ChevronLeft className="size-4 text-muted-fg" />
        </Link>
        <div className="flex size-7 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
          {recipient.name[0].toUpperCase()}
        </div>
        <p className="font-semibold">{recipient.name}</p>
        <span className="text-xs text-muted-fg">Direktnachricht</span>
      </div>

      {/* Nachrichten */}
      <div className="flex-1 overflow-y-auto bg-bg px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-fg">
            <div className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-xl font-bold text-brand">
              {recipient.name[0].toUpperCase()}
            </div>
            <p className="text-sm">
              Beginn deiner Unterhaltung mit <strong>{recipient.name}</strong>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const showAuthor = !prev || prev.authorId !== msg.authorId ||
                msg.sentAt.getTime() - prev.sentAt.getTime() > 5 * 60 * 1000;
              const isMe = msg.authorId === session.userId;

              return (
                <div key={msg.id} className={cn("flex gap-2.5", showAuthor && i > 0 && "mt-4")}>
                  {showAuthor ? (
                    <div className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isMe ? "bg-brand/10 text-brand" : "bg-muted text-muted-fg"
                    )}>
                      {msg.author.name[0].toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div className="flex-1">
                    {showAuthor && (
                      <div className="flex items-baseline gap-2">
                        <span className={cn("text-sm font-semibold", isMe && "text-brand")}>
                          {isMe ? "Du" : msg.author.name}
                        </span>
                        <span className="text-[10px] text-muted-fg">
                          {msg.sentAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Eingabe */}
      <DmBox recipientId={recipientId} />
    </div>
  );
}
