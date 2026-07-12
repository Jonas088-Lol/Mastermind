/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Nachrichten · Admin" };

export default async function AdminNachrichtenPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const participations = await prisma.messageParticipant.findMany({
    where: { userId: session.userId },
    include: {
      thread: {
        include: {
          messages: {
            orderBy: { sentAt: "desc" },
            take: 1,
            include: { sender: { select: { name: true, id: true } } },
          },
          participants: {
            where: { userId: { not: session.userId } },
            include: { user: { select: { name: true, role: true } } },
          },
        },
      },
    },
    orderBy: { thread: { updatedAt: "desc" } },
  });

  const unreadCount = participations.filter((p) => {
    const last = p.thread.messages[0];
    if (!last || last.sender.id === session.userId) return false;
    return !p.lastReadAt || p.lastReadAt < last.sentAt;
  }).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Intern</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Nachrichten</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {unreadCount > 0 ? (
              <span className="font-semibold text-fg">{unreadCount} ungelesen</span>
            ) : (
              "Alle gelesen"
            )}{" · "}
            {participations.length} Konversationen
          </p>
        </div>
        <Link href="/admin/nachrichten/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neue Nachricht
        </Link>
      </header>

      {participations.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border p-16 text-center">
          <MessageSquare className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">Keine Nachrichten</p>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border">
          {participations.map((p) => {
            const last = p.thread.messages[0];
            const isUnread =
              last &&
              last.sender.id !== session.userId &&
              (!p.lastReadAt || p.lastReadAt < last.sentAt);
            const others = p.thread.participants.map((x) => x.user);
            const displayName = others.map((u) => u.name).join(", ") || "Unbekannt";
            return (
              <Link
                key={p.thread.id}
                href={`/admin/nachrichten/${p.thread.id}`}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface",
                  isUnread && "bg-brand/3"
                )}
              >
                <Avatar name={displayName} size="sm" className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", isUnread ? "font-bold" : "font-semibold")}>
                      {displayName}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-fg">
                      {last
                        ? last.sentAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })
                        : "—"}
                    </span>
                  </div>
                  <p className={cn("mt-0.5 text-xs", isUnread ? "font-medium text-fg" : "text-muted-fg")}>
                    {p.thread.subject}
                  </p>
                  {last && (
                    <p className="mt-0.5 truncate text-xs text-muted-fg">
                      {last.sender.id === session.userId ? "Du: " : ""}
                      {last.content}
                    </p>
                  )}
                </div>
                {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
