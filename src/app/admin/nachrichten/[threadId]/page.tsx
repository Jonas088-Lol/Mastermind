import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/db/client";
import { sendMessage, markThreadRead } from "@/lib/actions/messaging";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

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
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy: { sentAt: "asc" },
      },
      participants: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!thread) notFound();

  await markThreadRead(threadId, session.userId);

  return (
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

      <div className="flex flex-col gap-4 px-5 py-6 min-h-100">
        {thread.messages.map((msg) => {
          const isOwn = msg.sender.id === session.userId;
          return (
            <div key={msg.id} className={cn("flex items-end gap-3", isOwn && "flex-row-reverse")}>
              {!isOwn && <Avatar name={msg.sender.name} size="sm" className="shrink-0" />}
              <div className={cn("flex max-w-[75%] flex-col gap-1", isOwn && "items-end")}>
                {!isOwn && (
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                    {msg.sender.name}
                  </p>
                )}
                <div
                  className={cn(
                    "border border-border px-4 py-3 text-sm leading-relaxed",
                    isOwn
                      ? "rounded-2xl rounded-tr-sm bg-brand text-brand-fg border-brand"
                      : "rounded-2xl rounded-tl-sm bg-bg"
                  )}
                >
                  {msg.content}
                </div>
                <p className="px-1 font-mono text-[10px] text-muted-fg">
                  {msg.sentAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}{" · "}
                  {msg.sentAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-bg px-5 py-4">
        <form action={sendMessage} className="flex items-end gap-3">
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="backHref" value={`/admin/nachrichten/${threadId}`} />
          <textarea
            name="content"
            rows={2}
            placeholder="Nachricht schreiben…"
            className="flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            required
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
          >
            <Send className="size-4" />
            Senden
          </button>
        </form>
      </div>
    </div>
  );
}
