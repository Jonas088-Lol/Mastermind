/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { berlinDayKey } from "@/lib/date-de";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Streak-Tracker · MasterMind" };

const MILESTONES = [7, 14, 30, 60, 100];

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function getNextMilestone(streak: number): number {
  return MILESTONES.find((m) => m > streak) ?? MILESTONES[MILESTONES.length - 1];
}

function getPrevMilestone(streak: number): number {
  const passed = MILESTONES.filter((m) => m <= streak);
  return passed[passed.length - 1] ?? 0;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Kalender-Schlüssel (YYYY-MM-DD) eines UTC-Instants — dient der DST-freien
 * Zell-Iteration über UTC-Mittag. Echte Aktivitäts-Zeitstempel werden dagegen
 * mit `berlinDayKey` auf den deutschen Kalendertag gebucketet.
 */
function utcKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export default async function StreaksPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const [user, loginHistory, xpHistory] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        streak: true,
        totalDailyLogins: true,
        lastLoginDate: true,
        streakFreezes: true,
        coins: true,
      },
    }),
    prisma.dailyLoginReward.findMany({
      where: { userId: session.userId },
      orderBy: { claimedAt: "desc" },
      take: 30,
    }),
    prisma.xpLog.findMany({
      where: {
        userId: session.userId,
        createdAt: {
          gte: new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const streak = user?.streak ?? 0;
  const totalDailyLogins = user?.totalDailyLogins ?? 0;
  const freezeCount = user?.streakFreezes ?? 0;

  // Anker: heutiger Berliner Kalendertag. Über einen UTC-Mittags-Instant rechnen
  // wir kalendarisch rückwärts — DST-frei und unabhängig von der Server-Zeitzone.
  const todayKey = berlinDayKey();
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const todayNoonUtc = Date.UTC(ty, tm - 1, td, 12);

  // Aktivität auf den deutschen Kalendertag bucketen (YYYY-MM-DD strings)
  const loginDates = new Set(loginHistory.map((r) => berlinDayKey(r.claimedAt)));
  // Also use xpLog dates as activity markers
  const xpDates = new Set(xpHistory.map((r) => berlinDayKey(r.createdAt)));

  const sevenDays = Array.from({ length: 7 }, (_, i) => {
    const ms = todayNoonUtc - (6 - i) * 86_400_000;
    const dateStr = utcKey(ms);
    const hasLogin = loginDates.has(dateStr) || xpDates.has(dateStr);
    return {
      dateStr,
      label: DAY_LABELS[new Date(ms).getUTCDay()],
      hasLogin,
      isToday: i === 6,
    };
  });

  // Heatmap: XP-Summe pro Tag, letzte 12 Wochen (Mo–So)
  const xpPerDay = new Map<string, number>();
  for (const log of xpHistory) {
    const key = berlinDayKey(log.createdAt);
    xpPerDay.set(key, (xpPerDay.get(key) ?? 0) + log.amount);
  }
  const maxXpPerDay = Math.max(1, ...xpPerDay.values());
  const mondayOffset = (new Date(todayNoonUtc).getUTCDay() + 6) % 7; // Mo=0 … So=6
  const gridStartNoonUtc = todayNoonUtc - (mondayOffset + 77) * 86_400_000; // Montag vor 11 Wochen

  const HEAT_CLASSES = [
    "bg-surface-2",
    "bg-brand/20",
    "bg-brand/40",
    "bg-brand/70",
    "bg-brand",
  ];

  const heatmapWeeks = Array.from({ length: 12 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const ms = gridStartNoonUtc + (w * 7 + d) * 86_400_000;
      const cell = new Date(ms);
      const key = utcKey(ms);
      const xp = xpPerDay.get(key) ?? 0;
      const level =
        xp <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((xp / maxXpPerDay) * 4)));
      return {
        key,
        xp,
        level,
        isFuture: key > todayKey,
        title: `${pad2(cell.getUTCDate())}.${pad2(cell.getUTCMonth() + 1)}.: ${xp} XP`,
      };
    })
  );

  // Milestone progress
  const nextMilestone = getNextMilestone(streak);
  const prevMilestone = getPrevMilestone(streak);
  const milestoneProgress = nextMilestone > prevMilestone
    ? ((streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100;
  const completedMilestones = MILESTONES.filter((m) => m <= streak);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Gamification
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Streak-Tracker
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          Dein täglicher Lernfortschritt auf einen Blick
        </p>
      </header>

      {/* Section 1 — Hero streak card */}
      <Card className="border-warning/40 bg-warning/2">
        <CardBody className="py-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl leading-none">🔥</span>
              <span className="text-5xl font-black tracking-tight">{streak}</span>
              <span className="text-lg font-semibold text-muted-fg">
                {streak === 1 ? "Tag" : "Tage"}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="warning">
                Aktueller Streak
              </Badge>
              <Badge variant="neutral">
                {totalDailyLogins} Anmeldungen gesamt
              </Badge>
            </div>

            {/* Freeze count */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <span className="text-lg font-bold">{freezeCount}</span>
                <span className="text-sm text-muted-fg">
                  {freezeCount === 1 ? "Streak-Freeze" : "Streak-Freezes"}
                </span>
              </div>
              <p className="text-xs text-muted-fg">
                Schützt deinen Streak einmalig bei verpasstem Tag
              </p>
              <Link
                href="/app/shop"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "mt-1"
                )}
              >
                <ShoppingBag className="size-3.5" />
                Mehr kaufen
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Section 2 — 7-day mini calendar */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Letzte 7 Tage
        </h2>
        <div className="grid grid-cols-7 gap-1.5">
          {sevenDays.map(({ dateStr, label, hasLogin, isToday }) => (
            <div
              key={dateStr}
              className={cn(
                "flex flex-col items-center gap-2 border py-3",
                isToday && "border-brand/40",
                hasLogin
                  ? "bg-success/6 border-success/30"
                  : "bg-surface border-border opacity-60"
              )}
            >
              <span className="text-[10px] font-semibold uppercase text-muted-fg">
                {label}
              </span>
              <div
                className={cn(
                  "size-7 flex items-center justify-center text-sm",
                  hasLogin
                    ? "bg-success text-white font-bold"
                    : "bg-surface-2 text-muted-fg"
                )}
              >
                {hasLogin ? "✓" : "–"}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted-fg">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-success" />
            Aktiv
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-surface-2 border border-border" />
            Verpasst
          </span>
        </div>
      </section>

      {/* Section 2b — Aktivitäts-Heatmap (12 Wochen) */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Aktivität der letzten 12 Wochen
        </h2>
        <Card>
          <CardBody>
            <div className="overflow-x-auto">
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 pr-1 text-[10px] text-muted-fg">
                  {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((l, i) => (
                    <span
                      key={l}
                      className="flex h-4 items-center leading-none"
                    >
                      {i % 2 === 0 ? l : ""}
                    </span>
                  ))}
                </div>
                {heatmapWeeks.map((week, w) => (
                  <div key={w} className="flex flex-col gap-1">
                    {week.map((day) => (
                      <div
                        key={day.key}
                        title={day.isFuture ? undefined : day.title}
                        className={cn(
                          "size-4 rounded-sm",
                          day.isFuture
                            ? "bg-transparent"
                            : HEAT_CLASSES[day.level]
                        )}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-fg">
              <span>Weniger</span>
              {HEAT_CLASSES.map((c) => (
                <span key={c} className={cn("size-3 rounded-sm", c)} />
              ))}
              <span>Mehr</span>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Section 3 — Streak milestones */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Meilensteine
        </h2>
        <Card>
          <CardBody className="pt-5">
            {streak < MILESTONES[MILESTONES.length - 1] ? (
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Nächster Meilenstein: {nextMilestone} Tage
                  </span>
                  <span className="font-mono text-xs text-muted-fg">
                    {streak} / {nextMilestone}
                  </span>
                </div>
                <Progress
                  value={streak}
                  max={nextMilestone}
                  tone={milestoneProgress >= 75 ? "success" : "brand"}
                />
                <p className="mt-1.5 text-xs text-muted-fg">
                  Noch {nextMilestone - streak}{" "}
                  {nextMilestone - streak === 1 ? "Tag" : "Tage"} bis zum
                  nächsten Meilenstein
                </p>
              </div>
            ) : (
              <div className="mb-5 text-center">
                <Badge variant="success">Alle Meilensteine erreicht! 🎉</Badge>
              </div>
            )}

            <div className="space-y-2">
              {MILESTONES.map((m) => {
                const done = streak >= m;
                return (
                  <div
                    key={m}
                    className={cn(
                      "flex items-center gap-3 border px-4 py-2.5",
                      done
                        ? "border-success/30 bg-success/4"
                        : "border-border opacity-50"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    ) : (
                      <div className="size-4 shrink-0 border border-border" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        done ? "text-fg" : "text-muted-fg"
                      )}
                    >
                      {m} Tage
                    </span>
                    {done && (
                      <Badge variant="success" className="ml-auto">
                        Erreicht
                      </Badge>
                    )}
                    {!done && streak > 0 && m === nextMilestone && (
                      <Badge variant="info" className="ml-auto">
                        In Arbeit
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Section 4 — Login history */}
      {loginHistory.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">
            Anmeldeverlauf (letzte 30 Einträge)
          </h2>
          <div className="divide-y divide-border border border-border">
            {loginHistory.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">🔥</span>
                  <div>
                    <p className="text-sm font-medium">Tag {r.day} im Zyklus</p>
                    <p className="text-xs text-muted-fg">
                      {r.claimedAt.toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-success">
                  +{r.xpAwarded} XP
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {loginHistory.length === 0 && (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-sm text-muted-fg">
              Noch keine Anmeldungen aufgezeichnet. Hol dir jeden Tag deinen
              Tagesbonus!
            </p>
            <Link
              href="/app/tagesbelohnung"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4")}
            >
              Tagesbonus einlösen
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
