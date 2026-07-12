/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { Fragment } from "react";
import {
  ArrowRight,
  CheckSquare,
  Clock,
  Flame,
  Swords,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { prisma } from "@/lib/db/client";
import { berlinDayKey, berlinStartOfDay } from "@/lib/date-de";
import { DashboardGreeting } from "@/components/app/DashboardGreeting";
import { getAiQuota } from "@/lib/db/store";
import { getSession } from "@/lib/session";
import { DailyGoalCard } from "@/components/app/DailyGoalCard";
import { getDailyGoalStatus, getWeeklyGoalStatus } from "@/lib/learning-goals";
import { COIN_REWARDS } from "@/lib/coins";
import { levelFromXp, getRankForXp } from "@/lib/game";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const PERIOD_TIMES = [
  "08:00", "08:50", "09:50", "10:40", "11:35", "12:25", "13:25", "14:15", "15:00",
];

const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const firstName = session.name.split(" ")[0];

  const now = new Date();
  const TODAY_DOW = now.getDay() === 0 ? 7 : now.getDay();

  // Upcoming assignments (due within 7 days, not submitted/graded)
  const upcomingAssignments = session.classId
    ? await prisma.assignment.findMany({
        where: {
          classId: session.classId,
          dueAt: { lte: new Date(now.getTime() + 7 * 86_400_000) },
          submissions: {
            none: {
              studentId: session.userId,
              status: { in: ["submitted", "graded"] },
            },
          },
        },
        include: {
          subject: { select: { name: true, shortName: true, color: true } },
          teacher: { select: { name: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 5,
      })
    : [];

  // Today's timetable
  const todayEntries = session.classId
    ? await prisma.timetableEntry.findMany({
        where: { classId: session.classId, day: TODAY_DOW },
        include: {
          subject: { select: { name: true, color: true } },
          teacher: { select: { name: true } },
        },
        orderBy: { period: "asc" },
      })
    : [];

  // Recent grades (last 30 days)
  const recentGrades = await prisma.grade.findMany({
    where: {
      studentId: session.userId,
      date: { gte: new Date(now.getTime() - 30 * 86_400_000) },
    },
    include: { subject: { select: { name: true, shortName: true, color: true } } },
    orderBy: { date: "desc" },
    take: 3,
  });

  // Overall avg grade — weighted average computed in JS from minimal DB projection.
  // Prisma doesn't support native weighted averages, so we fetch only value+weight
  // (no unnecessary columns) and compute server-side before sending to the client.
  const allGrades = await prisma.grade.findMany({
    where: { studentId: session.userId },
    select: { value: true, weight: true },
  });
  const totalWeight = allGrades.reduce((s, g) => s + g.weight, 0);
  const avgGrade = totalWeight > 0
    ? allGrades.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight
    : null;

  // Recent achievements
  const recentAchievements = await prisma.userAchievement.findMany({
    where: { userId: session.userId },
    orderBy: { unlockedAt: "desc" },
    take: 3,
  });

  // KI quota from DB
  const quota = await getAiQuota(session.email);
  const quotaUsed = quota.used;
  const quotaMax = quota.limit;
  const quotaFree = Math.max(0, quotaMax - quotaUsed);

  // Streak + XP from stored fields
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const todayStart = berlinStartOfDay(now);
  const [userXpData, weeklyXpLogs, dailyGoal, weeklyGoal] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { xp: true, streak: true, lastActiveDate: true },
    }),
    prisma.xpLog.aggregate({
      where: { userId: session.userId, createdAt: { gte: sevenDaysAgo } },
      _sum: { amount: true },
    }),
    getDailyGoalStatus(session.userId),
    getWeeklyGoalStatus(session.userId),
  ]);
  const streak = userXpData?.streak ?? 0;
  const currentXp = userXpData?.xp ?? 0;
  const weeklyXp = weeklyXpLogs._sum.amount ?? 0;
  const rank = getRankForXp(currentXp);
  const level = levelFromXp(currentXp);

  // Pending quest claims
  const pendingQuestClaims = await prisma.userQuest.count({
    where: { userId: session.userId, completedAt: { not: null }, claimedAt: null },
  });

  // Active boss battle
  const activeBoss = await prisma.bossBattle.findFirst({
    where: { isActive: true, OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }] },
    select: { name: true, currentHp: true, maxHp: true, icon: true },
  });

  // Daily login reward status
  const todayLoginStr = berlinDayKey(now);
  const userLoginData = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lastLoginDate: true },
  });
  const dailyBonusAvailable = userLoginData?.lastLoginDate !== todayLoginStr;

  // Daily challenge: deterministically pick a topic by date seed
  const allTopics = await prisma.exerciseTopic.findMany({
    select: { id: true, title: true, subject: true, grade: true, description: true },
    orderBy: { id: "asc" },
  });
  const todayStr = berlinDayKey(now);
  const dateSeed = todayStr.replace(/-/g, "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const dailyTopic = allTopics.length > 0 ? allTopics[dateSeed % allTopics.length] : null;
  const dailyChallengeCompleted = dailyTopic
    ? !!(await prisma.exerciseProgress.findFirst({
        where: {
          userId: session.userId,
          topicId: dailyTopic.id,
          completedAt: { gte: todayStart },
        },
      }))
    : false;

  const openCount = upcomingAssignments.length;
  const todayDate = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">

      {/* ── Hero greeting banner ── */}
      <header className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#BBF7D0] to-[#BAE6FD] px-6 py-8 shadow-sm sm:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <span className="text-5xl leading-none drop-shadow-sm">{rank.icon}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">
                {todayDate}
              </p>
              <DashboardGreeting firstName={firstName} />
              <p className="mt-1 text-sm text-slate-500">
                Du hast{" "}
                <span className="font-semibold text-slate-700">{openCount} offene Aufgaben</span> in den
                nächsten 7 Tagen.
              </p>
            </div>
          </div>
          <Link
            href="/app/plan"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/60 bg-white/60 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/80"
          >
            Stundenplan
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {/* Decorative blobs */}
        <span className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-emerald-200/50 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-6 right-24 size-28 rounded-full bg-sky-200/40 blur-2xl" />
      </header>

      {/* ── Stat cards ── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Streak */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Streak</p>
            <Flame className="size-4 text-muted-fg" strokeWidth={1.75} />
          </div>
          <p className="font-mono text-3xl font-bold tracking-tight text-fg">
            {streak > 0 ? String(streak) : "0"}
            <span className="ml-2 align-baseline text-xs font-medium text-muted-fg">Tage</span>
          </p>
        </div>

        {/* XP */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">XP diese Woche</p>
            <Zap className="size-4 text-muted-fg" strokeWidth={1.75} />
          </div>
          <p className="font-mono text-3xl font-bold tracking-tight text-fg">
            {weeklyXp > 0 ? `+${weeklyXp}` : "0"}
            <span className="ml-2 align-baseline text-xs font-medium text-muted-fg">{currentXp} gesamt</span>
          </p>
        </div>

        {/* KI */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">KI-Anfragen</p>
            <Sparkles className="size-4 text-muted-fg" strokeWidth={1.75} />
          </div>
          <p className="font-mono text-3xl font-bold tracking-tight text-fg">
            {String(quotaUsed)}
            <span className="ml-2 align-baseline text-xs font-medium text-muted-fg">/ {quotaMax}</span>
          </p>
        </div>

        {/* Grade */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ø-Note</p>
            <Trophy className="size-4 text-muted-fg" strokeWidth={1.75} />
          </div>
          <p className="font-mono text-3xl font-bold tracking-tight text-fg">
            {avgGrade ? avgGrade.toFixed(1).replace(".", ",") : "—"}
            <span className="ml-2 align-baseline text-xs font-medium text-muted-fg">alle Fächer</span>
          </p>
          <Link
            href="/app/noten/verlauf"
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            <TrendingUp className="size-3" />
            Verlauf ansehen
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <div>
                <CardTitle>Bald fällig</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">{openCount} offen</p>
              </div>
              <Link href="/app/aufgaben">
                <Button variant="ghost" size="sm">
                  Alle Aufgaben
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {upcomingAssignments.length === 0 ? (
                <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
                  Keine offenen Aufgaben in den nächsten 7 Tagen. 🎉
                </div>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {upcomingAssignments.map((a) => {
                    const daysLeft = Math.floor((a.dueAt.getTime() - now.getTime()) / 86_400_000);
                    return (
                      <li key={a.id} style={{ borderLeftColor: a.subject.color }} className="border-l-4">
                        <Link
                          href={`/app/aufgaben/${a.id}`}
                          className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface"
                        >
                          <span className="grid size-5 shrink-0 place-items-center rounded border border-border-strong text-border-strong">
                            <CheckSquare className="size-3" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold"
                                style={{ backgroundColor: a.subject.color + "22", color: a.subject.color }}
                              >
                                {a.subject.shortName}
                              </span>
                              <p className="truncate text-sm font-medium">{a.title}</p>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-fg">{a.teacher.name}</p>
                          </div>
                          <span className="hidden font-mono text-xs text-muted-fg sm:inline">
                            {daysLeft === 0 ? "Heute" : daysLeft === 1 ? "Morgen" : `in ${daysLeft} Tagen`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <div>
                <CardTitle>Heute · {DAY_NAMES[TODAY_DOW - 1]}</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {todayEntries.length} Stunden
                </p>
              </div>
              <Link href="/app/plan">
                <Button variant="ghost" size="sm">
                  Woche
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {todayEntries.length === 0 ? (
                <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
                  Kein Stundenplan für heute.
                </div>
              ) : (
                <ol className="divide-y divide-border border-t border-border">
                  {todayEntries.map((e) => (
                    <li
                      key={e.id}
                      style={{ borderLeftColor: e.subject.color }}
                      className="flex items-center gap-4 border-l-4 px-5 py-3 text-sm transition-colors hover:bg-surface"
                    >
                      <span className="w-6 font-mono text-xs text-muted-fg">{e.period}.</span>
                      <span
                        className="flex size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: e.subject.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{e.subject.name}</p>
                        <p className="text-xs text-muted-fg">
                          {e.teacher.name} · Raum {e.room ?? "—"}
                        </p>
                      </div>
                      <span className="hidden font-mono text-[10px] text-muted-fg sm:inline">
                        {PERIOD_TIMES[e.period - 1] ?? ""}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-brand/40 bg-linear-to-br from-brand/8 to-transparent shadow-sm">
            <CardBody className="p-5!">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">KI-Vorschlag</p>
              </div>
              <p className="mt-4 text-base font-semibold leading-snug">
                {recentGrades.length > 0 && recentGrades[0].value >= 3 ? (
                  <>
                    Du hattest in{" "}
                    <span className="text-brand">{recentGrades[0].subject.name}</span> eine{" "}
                    {recentGrades[0].value.toFixed(1).replace(".", ",")}. Jetzt gegensteuern.
                  </>
                ) : (
                  <>Gute Woche! Nutze die Zeit, deine Stärken weiter auszubauen.</>
                )}
              </p>
              <p className="mt-2 text-sm text-muted-fg">
                10 Minuten gezielte Übung können die nächste Klassenarbeit verbessern.
              </p>
              <Link href="/app/lernen" className={buttonVariants({ className: "mt-5 w-full" })}>
                Übung starten
                <ArrowRight className="size-3.5" />
              </Link>
              <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted-fg">
                Noch {quotaFree} KI-Anfragen frei
              </p>
            </CardBody>
          </Card>

          {/* Gamification quick access */}
          <Card className="rounded-2xl shadow-sm">
            <CardBody className="p-5!">
              {/* Rank hero */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-5xl leading-none drop-shadow-sm">{rank.icon}</span>
                  <div>
                    <p className="text-lg font-extrabold leading-tight" style={{ color: rank.color }}>{rank.nameDE}</p>
                    <p className="text-xs text-muted-fg">Level {level} · {currentXp.toLocaleString("de-DE")} XP</p>
                  </div>
                </div>
                <Link href="/app/ranking" className="text-xs text-muted-fg hover:text-fg">Ranking →</Link>
              </div>
              <div className="mt-5 space-y-1.5">
                <Link
                  href="/app/quests"
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface",
                    pendingQuestClaims > 0 ? "bg-warning/5" : "bg-surface",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Zap className="size-3.5 text-warning" />
                    Quests
                  </span>
                  {pendingQuestClaims > 0 && (
                    <Badge variant="warning">{pendingQuestClaims} offen</Badge>
                  )}
                </Link>
                {activeBoss && (
                  <Link href="/app/boss" className="flex items-center justify-between rounded-xl bg-danger/4 px-3 py-2.5 text-sm transition-colors hover:bg-danger/7">
                    <span className="flex items-center gap-2">
                      <Swords className="size-3.5 text-danger" />
                      <span>{activeBoss.icon} {activeBoss.name}</span>
                    </span>
                    <Badge variant="danger">Aktiv</Badge>
                  </Link>
                )}
                {dailyBonusAvailable && (
                  <Link href="/app/tagesbelohnung" className="flex items-center justify-between rounded-xl bg-success/4 px-3 py-2.5 text-sm transition-colors hover:bg-success/7">
                    <span className="flex items-center gap-2">
                      <span>☀️</span>
                      Tagesbonus
                    </span>
                    <Badge variant="success">Abholen!</Badge>
                  </Link>
                )}
              </div>
            </CardBody>
          </Card>

          {recentGrades.length > 0 && (
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Letzte Noten</CardTitle>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {recentGrades.map((g) => (
                    <li
                      key={g.id}
                      style={{ borderLeftColor: g.subject.color }}
                      className="flex items-center gap-3 border-l-4 px-5 py-3"
                    >
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: g.subject.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{g.subject.name}</p>
                        <p className="text-xs text-muted-fg">
                          {g.date.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "font-mono text-lg font-bold",
                          g.value >= 4 && "text-danger",
                          g.value >= 3 && g.value < 4 && "text-warning"
                        )}
                      >
                        {g.value.toFixed(1).replace(".", ",")}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {dailyTopic && (
            <Card className={cn(
              "rounded-2xl shadow-sm",
              "border-warning/40",
              dailyChallengeCompleted
                ? "bg-linear-to-br from-success/6 to-transparent border-success/40"
                : "bg-linear-to-br from-warning/6 to-transparent"
            )}>
              <CardBody className="p-5!">
                <div className="flex items-center gap-2">
                  <Swords className={cn("size-4", dailyChallengeCompleted ? "text-success" : "text-warning")} strokeWidth={1.75} />
                  <p className={cn("text-xs font-semibold uppercase tracking-wider", dailyChallengeCompleted ? "text-success" : "text-warning")}>
                    Tagesherausforderung
                  </p>
                  {dailyChallengeCompleted && (
                    <span className="ml-auto text-xs font-semibold text-success">✓ Erledigt</span>
                  )}
                </div>
                <p className="mt-3 text-base font-semibold leading-snug">{dailyTopic.title}</p>
                <p className="mt-1 text-xs text-muted-fg capitalize">
                  {dailyTopic.subject} · Klasse {dailyTopic.grade}
                </p>
                {dailyTopic.description && (
                  <p className="mt-2 text-sm text-muted-fg">{dailyTopic.description}</p>
                )}
                {!dailyChallengeCompleted && (
                  <Link
                    href={`/app/uebungen/${dailyTopic.subject}/${dailyTopic.grade}/${dailyTopic.id}/quiz`}
                    className={buttonVariants({ className: "mt-4 w-full" })}
                  >
                    Challenge starten
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </CardBody>
            </Card>
          )}

          <DailyGoalCard
            daily={dailyGoal}
            weekly={weeklyGoal}
            dailyReward={COIN_REWARDS.daily_goal}
            weeklyReward={COIN_REWARDS.weekly_goal}
          />

          {recentAchievements.length > 0 && (
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Neue Achievements</CardTitle>
                <Badge variant="success">+{recentAchievements.length}</Badge>
              </CardHeader>
              <CardBody>
                <ul className="space-y-3">
                  {recentAchievements.map((ua, i) => {
                    const def = ACHIEVEMENTS.find((a) => a.slug === ua.slug);
                    if (!def) return null;
                    const elapsed = now.getTime() - ua.unlockedAt.getTime();
                    const earnedLabel =
                      elapsed < 3_600_000
                        ? `vor ${Math.max(1, Math.floor(elapsed / 60_000))} Min.`
                        : elapsed < 86_400_000
                        ? `vor ${Math.floor(elapsed / 3_600_000)} Std.`
                        : ua.unlockedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
                    return (
                      <Fragment key={ua.slug}>
                        {i > 0 && <Separator />}
                        <Achievement
                          icon={<span className="text-base">{def.icon}</span>}
                          title={def.title}
                          body={def.description}
                          earned={earnedLabel}
                        />
                      </Fragment>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-fg">
            <Clock className="size-3" />
            Daten aktualisieren sich live
          </p>
        </div>
      </div>
    </div>
  );
}

function Achievement({
  icon,
  title,
  body,
  earned,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  earned: string;
}) {
  return (
    <li className="flex gap-3">
      <div className="grid size-9 shrink-0 place-items-center border border-border bg-surface text-brand">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-fg">{body}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-fg">{earned}</p>
      </div>
    </li>
  );
}
