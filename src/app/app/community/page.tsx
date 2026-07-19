/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  ArrowRight,
  Crown,
  FileText,
  Flame,
  Plus,
  Sparkles,
  Swords,
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
import { levelFromXp } from "@/lib/xp";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) === "super") redirect("/plattform");

  const schoolId = session.schoolId;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [dbNotes, leaderboardUsers, activeTodayCount, publicNotesCount, maxStreakResult, school] =
    await Promise.all([
      prisma.note.findMany({
        where: { isPublic: true, author: { schoolId: schoolId ?? "" } },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
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

  // Freunde-Vergleich: angenommene Freundschaften, XP der Woche aus XpLog
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: session.userId }, { addresseeId: session.userId }],
    },
    include: {
      requester: { select: { id: true, name: true, xp: true, streak: true } },
      addressee: { select: { id: true, name: true, xp: true, streak: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  const friends = friendships.map((f) =>
    f.requesterId === session.userId ? f.addressee : f.requester
  );

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, xp: true, streak: true },
  });

  const weekStart = new Date(now);
  const dow = (weekStart.getDay() + 6) % 7; // Montag = 0
  weekStart.setDate(weekStart.getDate() - dow);
  weekStart.setHours(0, 0, 0, 0);

  const weeklyXpRaw =
    friends.length > 0
      ? await prisma.xpLog.groupBy({
          by: ["userId"],
          where: {
            userId: { in: [session.userId, ...friends.map((f) => f.id)] },
            createdAt: { gte: weekStart },
          },
          _sum: { amount: true },
        })
      : [];
  const weeklyXp = new Map(weeklyXpRaw.map((r) => [r.userId, r._sum.amount ?? 0]));
  const myWeekXp = weeklyXp.get(session.userId) ?? 0;
  const isStudent = effectiveRole(session) === "student";

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
                <CardTitle>Freunde-Vergleich</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  Du vs. deine Freunde · XP diese Woche, Streak & Level
                </p>
              </div>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {friends.length === 0 ? (
                <div className="border-t border-border px-5 py-8 text-center">
                  <Users className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-semibold">Noch keine Freunde verbunden</p>
                  <p className="mt-1 text-xs text-muted-fg">
                    Füge im MasterSpace Freunde hinzu, um euch hier zu vergleichen.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {friends.map((f) => (
                    <FriendCompareRow
                      key={f.id}
                      friendName={f.name}
                      me={{
                        weekXp: myWeekXp,
                        streak: me?.streak ?? 0,
                        level: levelFromXp(me?.xp ?? 0),
                      }}
                      friend={{
                        weekXp: weeklyXp.get(f.id) ?? 0,
                        streak: f.streak,
                        level: levelFromXp(f.xp),
                      }}
                      showDuel={isStudent}
                    />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

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

        </div>

        <aside className="space-y-6">
          <Card className="border-brand/40 bg-linear-to-br from-brand/8 to-transparent">
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
                  {myRank === -1 && (
                    <li className="flex items-center gap-3 bg-brand/6 px-5 py-2.5">
                      <span className="grid size-7 shrink-0 place-items-center bg-surface font-mono text-xs font-bold text-muted-fg">
                        —
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-brand">Du</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-fg">Noch nicht platziert</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold tabular-nums">0</p>
                        <p className="font-mono text-[10px] text-muted-fg">XP</p>
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

type CompareStats = { weekXp: number; streak: number; level: number };

function CompareBar({
  label,
  unit,
  mine,
  theirs,
}: {
  label: string;
  unit: string;
  mine: number;
  theirs: number;
}) {
  const max = Math.max(mine, theirs, 1);
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-xl bg-surface">
            <div
              className="h-full rounded-xl bg-brand"
              style={{ width: `${Math.round((mine / max) * 100)}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums">
            {mine.toLocaleString("de-DE")}
            {unit}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-xl bg-surface">
            <div
              className="h-full rounded-xl bg-fg/40"
              style={{ width: `${Math.round((theirs / max) * 100)}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-fg">
            {theirs.toLocaleString("de-DE")}
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

function FriendCompareRow({
  friendName,
  me,
  friend,
  showDuel,
}: {
  friendName: string;
  me: CompareStats;
  friend: CompareStats;
  showDuel: boolean;
}) {
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={friendName} size="sm" />
          <p className="text-sm font-semibold">
            Du <span className="font-normal text-muted-fg">vs.</span> {friendName}
          </p>
        </div>
        {showDuel && (
          <Link
            href="/app/duelle"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Swords className="size-3.5" />
            Zum Duell fordern
          </Link>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <CompareBar label="XP diese Woche" unit="" mine={me.weekXp} theirs={friend.weekXp} />
        <CompareBar label="Streak" unit=" T" mine={me.streak} theirs={friend.streak} />
        <CompareBar label="Level" unit="" mine={me.level} theirs={friend.level} />
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-fg">
        <span className="mr-3 inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-xl bg-brand" /> Du
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-xl bg-fg/40" /> {friendName}
        </span>
      </p>
    </li>
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
