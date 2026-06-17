import {
  ArrowRight,
  Crown,
  FileText,
  Flame,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Community" };

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return "gestern";
  return `vor ${d} Tagen`;
}

export default async function CommunityPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) === "super") redirect("/plattform");

  const schoolId = session.schoolId;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [dbNotes, threads, leaderboardUsers, activeTodayCount, publicNotesCount, maxStreakResult, school] =
    await Promise.all([
      prisma.note.findMany({
        where: { isPublic: true, author: { schoolId: schoolId ?? "" } },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.messageThread.findMany({
        where: {
          participants: { some: { userId: session.userId } },
          ...(schoolId ? { schoolId } : {}),
        },
        include: {
          participants: { where: { userId: session.userId }, select: { lastReadAt: true } },
          messages: {
            orderBy: { sentAt: "desc" },
            take: 1,
            include: { sender: { select: { name: true } } },
          },
          _count: { select: { participants: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.user.findMany({
        where: { ...(schoolId ? { schoolId } : {}), role: "student" },
        select: { id: true, name: true, klasse: true, xp: true },
        orderBy: { xp: "desc" },
        take: 8,
      }),
      prisma.session.count({
        where: { createdAt: { gte: startOfDay }, ...(schoolId ? { user: { schoolId } } : {}) },
      }),
      prisma.note.count({ where: { isPublic: true, author: { schoolId: schoolId ?? "" } } }),
      prisma.user.aggregate({ _max: { streak: true }, where: schoolId ? { schoolId } : {} }),
      schoolId ? prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }) : Promise.resolve(null),
    ]);

  const groups = threads.map((t) => {
    const lastMsg = t.messages[0];
    const myPart = t.participants[0];
    const hasUnread = !!lastMsg && (!myPart?.lastReadAt || myPart.lastReadAt < lastMsg.sentAt);
    return {
      id: t.id,
      name: t.subject,
      members: t._count.participants,
      unread: hasUnread ? 1 : 0,
      lastMessage: lastMsg?.content?.slice(0, 100) ?? "",
      lastFrom: lastMsg?.sender.name.split(" ")[0] ?? "",
      lastTime: lastMsg ? relativeTime(lastMsg.sentAt) : "—",
    };
  });

  const myRank = leaderboardUsers.findIndex((u) => u.id === session.userId);
  const maxStreak = maxStreakResult._max.streak ?? 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Lerncommunity{school ? ` · ${school.name}` : ""}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Community
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Lernen mit deiner Klasse · moderiert · DSGVO-konform
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/community/notizen/neu" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-3.5" />
            Notiz teilen
          </Link>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Geteilte Lernnotizen</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  Top-bewertete Notizen deiner Klassenstufe
                </p>
              </div>
              <Link
                href="/app/community/notizen"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Alle Notizen
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {dbNotes.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <FileText className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-semibold">Noch keine öffentlichen Notizen</p>
                  <p className="mt-1 text-xs text-muted-fg">
                    Sei die erste Person, die eine Lernnotiz teilt!
                  </p>
                  <Link
                    href="/app/community/notizen/neu"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand hover:underline"
                  >
                    <Plus className="size-3" />
                    Notiz erstellen
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {dbNotes.map((n) => (
                    <DbNoteRow key={n.id} note={n} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Lerngruppen</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {groups.length} Gespräche · {groups.filter((g) => g.unread > 0).length} ungelesen
                </p>
              </div>
              <Link href="/app/nachrichten" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Alle öffnen
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {groups.length === 0 ? (
                <div className="border-t border-border px-5 py-8 text-center text-sm text-muted-fg">
                  Noch keine Nachrichten. Schreibe deiner Klasse!
                </div>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {groups.map((g) => (
                    <GroupRow key={g.id} group={g} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-brand/40 bg-gradient-to-br from-brand/8 to-transparent">
            <CardBody className="p-5!">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Wochen-Challenge
                </p>
              </div>
              <p className="mt-3 text-base font-semibold leading-snug">
                Helfe 3 Klassenkameraden mit einer Antwort
              </p>
              <p className="mt-2 text-sm text-muted-fg">
                Belohnung: <span className="font-semibold text-fg">+250 XP</span>
              </p>
              <Link href="/app/aufgaben" className={buttonVariants({ className: "mt-5 w-full" })}>
                Challenge öffnen
                <ArrowRight className="size-3.5" />
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schul-Ranking</CardTitle>
              <Badge variant="outline">XP</Badge>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {leaderboardUsers.length === 0 ? (
                <p className="border-t border-border px-5 py-4 text-sm text-muted-fg">Noch keine XP-Daten.</p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {leaderboardUsers.map((u, idx) => {
                    const rank = idx + 1;
                    const isMe = u.id === session.userId;
                    return (
                      <li
                        key={u.id}
                        className={cn("flex items-center gap-3 px-5 py-2.5", isMe && "bg-brand/6")}
                      >
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center font-mono text-xs font-bold",
                            rank === 1 && "bg-warning text-bg",
                            rank === 2 && "bg-fg/70 text-bg",
                            rank === 3 && "bg-fg/40 text-bg",
                            rank > 3 && "bg-surface text-muted-fg"
                          )}
                        >
                          {rank === 1 ? <Crown className="size-3.5" /> : rank}
                        </span>
                        <Avatar name={u.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm", isMe ? "font-bold text-brand" : "font-semibold")}>
                            {isMe ? "Du" : u.name}
                          </p>
                          {u.klasse && (
                            <p className="text-[10px] uppercase tracking-wider text-muted-fg">Klasse {u.klasse}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-bold tabular-nums">{u.xp.toLocaleString("de-DE")}</p>
                          <p className="font-mono text-[10px] text-muted-fg">XP</p>
                        </div>
                      </li>
                    );
                  })}
                  {myRank >= leaderboardUsers.length && (
                    <li className="flex items-center gap-3 bg-brand/6 px-5 py-2.5">
                      <span className="grid size-7 shrink-0 place-items-center bg-surface font-mono text-xs font-bold text-muted-fg">
                        {myRank + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-brand">Du</p>
                      </div>
                    </li>
                  )}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schul-Statistik</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-fg">
                    <Users className="size-3.5" />
                    Aktive heute
                  </span>
                  <span className="font-mono font-bold">{activeTodayCount.toLocaleString("de-DE")}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-fg">
                    <FileText className="size-3.5" />
                    Geteilte Notizen
                  </span>
                  <span className="font-mono font-bold">{publicNotesCount.toLocaleString("de-DE")}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-fg">
                    <Flame className="size-3.5" />
                    Längster Streak
                  </span>
                  <span className="font-mono font-bold">{maxStreak} Tage</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

type DbNote = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  author: { name: string };
};

function DbNoteRow({ note }: { note: DbNote }) {
  const preview = note.content.slice(0, 120) + (note.content.length > 120 ? "…" : "");
  const dateStr = note.createdAt.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <div className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface lg:flex-row lg:items-center lg:gap-4">
      <div className="grid size-12 shrink-0 place-items-center bg-surface text-fg">
        <FileText className="size-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">
            <TrendingUp className="size-3" />
            Öffentlich
          </Badge>
        </div>
        <p className="mt-1 text-sm font-semibold">{note.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-fg">{preview}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
          {note.author.name} · {dateStr}
        </p>
      </div>
    </div>
  );
}

type ThreadGroup = { id: string; name: string; members: number; unread: number; lastMessage: string; lastFrom: string; lastTime: string };

function GroupRow({ group }: { group: ThreadGroup }) {
  return (
    <Link
      href={`/app/nachrichten/${group.id}`}
      className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-surface"
    >
      <div className="grid size-10 shrink-0 place-items-center bg-fg text-bg">
        <Users className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{group.name}</p>
          {group.unread > 0 && <Badge variant="brand">{group.unread}</Badge>}
        </div>
        {group.lastMessage && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-fg">
            <span className="font-medium text-fg">{group.lastFrom}: </span>
            {group.lastMessage}
          </p>
        )}
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
          {group.members} Teilnehmer · {group.lastTime}
        </p>
      </div>
    </Link>
  );
}
