import { Hash, ChevronLeft, Users, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ChatBox } from "./ChatBox";
import { MessageRow } from "./MessageRow";
import { createChannel } from "../../actions";

export const metadata: Metadata = { title: "MasterSpace" };

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ spaceId: string; channelId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { spaceId, channelId } = await params;

  const [space, membership] = await Promise.all([
    prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        channels: { orderBy: { position: "asc" } },
        members: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
    }),
    prisma.spaceMember.findFirst({
      where: { spaceId, userId: session.userId },
    }),
  ]);

  if (!space || !membership) notFound();

  const channel = space.channels.find((c) => c.id === channelId);
  if (!channel) {
    const first = space.channels[0];
    if (first) redirect(`/app/masterspace/${spaceId}/${first.id}`);
    notFound();
  }

  const messages = await prisma.spaceMessage.findMany({
    where: { channelId, parentId: null },
    include: {
      author: { select: { id: true, name: true } },
      reactions: { select: { id: true, emoji: true, userId: true } },
    },
    orderBy: { sentAt: "asc" },
    take: 100,
  });

  const isAdmin = membership.role === "owner" || membership.role === "admin";

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border lg:h-[calc(100vh-5rem)]">

      {/* Linke Sidebar: Space-Navigation */}
      <div className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        {/* Space-Header */}
        <div className="flex h-12 items-center gap-2 border-b border-border px-3">
          <span className="text-lg">{space.emoji}</span>
          <p className="flex-1 truncate text-sm font-bold">{space.name}</p>
          <Link href="/app/masterspace" className="rounded p-1 hover:bg-muted">
            <ChevronLeft className="size-4 text-muted-fg" />
          </Link>
        </div>

        {/* Kanäle */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Kanäle</p>
            {isAdmin && (
              <form action={createChannel}>
                <input type="hidden" name="spaceId" value={spaceId} />
                <button type="submit" className="rounded p-0.5 hover:bg-muted" title="Kanal hinzufügen"
                  onClick={(e) => {
                    const name = prompt("Kanalname:");
                    if (!name) e.preventDefault();
                    else {
                      const input = document.createElement("input");
                      input.name = "name";
                      input.value = name;
                      e.currentTarget.form?.appendChild(input);
                    }
                  }}
                >
                  <Plus className="size-3.5 text-muted-fg" />
                </button>
              </form>
            )}
          </div>
          {space.channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/app/masterspace/${spaceId}/${ch.id}`}
              className={cn(
                "mx-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                ch.id === channelId
                  ? "bg-brand/10 font-semibold text-brand"
                  : "text-muted-fg hover:bg-muted hover:text-fg"
              )}
            >
              <Hash className="size-3.5 shrink-0" />
              <span className="truncate">{ch.name}</span>
            </Link>
          ))}
        </div>

        {/* Mitglieder-Zahl */}
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-xs text-muted-fg">
          <Users className="size-3.5" />
          {space.members.length} Mitglieder
        </div>
      </div>

      {/* Chat-Bereich */}
      <div className="flex flex-1 flex-col overflow-hidden bg-bg">
        {/* Channel-Header */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <Hash className="size-4 text-muted-fg" />
          <p className="font-semibold">{channel.name}</p>
        </div>

        {/* Nachrichten */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-fg">
              <Hash className="size-8" strokeWidth={1.5} />
              <p className="text-sm">Schreib die erste Nachricht in #{channel.name}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((msg, i) => {
                const prev = messages[i - 1];
                const showAuthor = !prev || prev.authorId !== msg.authorId ||
                  msg.sentAt.getTime() - prev.sentAt.getTime() > 5 * 60 * 1000;
                const isMe = msg.authorId === session.userId;

                return (
                  <MessageRow
                    key={msg.id}
                    message={msg}
                    showAuthor={showAuthor && i > 0}
                    isMe={isMe}
                    isSpaceAdmin={isAdmin}
                    currentUserId={session.userId}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Eingabe */}
        <ChatBox channelId={channelId} />
      </div>

      {/* Rechte Sidebar: Mitglieder (Desktop) */}
      <div className="hidden w-48 shrink-0 flex-col border-l border-border bg-surface xl:flex">
        <div className="flex h-12 items-center gap-2 border-b border-border px-3">
          <Users className="size-4 text-muted-fg" />
          <p className="text-sm font-semibold">Mitglieder</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {space.members.map((m) => (
            <Link
              key={m.userId}
              href={`/app/masterspace/dm/${m.userId}`}
              className={cn(
                "mx-1 flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted",
                m.userId === session.userId && "pointer-events-none"
              )}
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                {m.user.name[0].toUpperCase()}
              </div>
              <span className="truncate text-xs font-medium">
                {m.userId === session.userId ? "Du" : m.user.name}
              </span>
              {m.role === "owner" && <span className="ml-auto text-[9px] text-warning">👑</span>}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
