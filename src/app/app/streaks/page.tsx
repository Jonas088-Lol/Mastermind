import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Streak-Tracker · MasterMind" };

const MILESTONES = [3, 7, 14, 30, 50, 100];

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function getNextMilestone(streak: number): number {
  return MILESTONES.find((m) => m > streak) ?? MILESTONES[MILESTONES.length - 1];
}

function getPrevMilestone(streak: number): number {
  const passed = MILESTONES.filter((m) => m <= streak);
  return passed[passed.length - 1] ?? 0;
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
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  const streak = user?.streak ?? 0;
  const totalDailyLogins = user?.totalDailyLogins ?? 0;
  const freezeCount = user?.streakFreezes ?? 0;

  // Build 7-day calendar: today = day 6, going back 6 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build set of login dates from login history (YYYY-MM-DD strings)
  const loginDates = new Set(
    loginHistory.map((r) => r.claimedAt.toISOString().slice(0, 10))
  );
  // Also use xpLog dates as activity markers
  const xpDates = new Set(
    xpHistory.map((r) => r.createdAt.toISOString().slice(0, 10))
  );

  const sevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const hasLogin = loginDates.has(dateStr) || xpDates.has(dateStr);
    return {
      date: d,
      dateStr,
      label: DAY_LABELS[d.getDay()],
      hasLogin,
      isToday: i === 6,
    };
  });

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
      <Card className="border-warning/40 bg-warning/[0.02]">
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
                  ? "bg-success/[0.06] border-success/30"
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
                        ? "border-success/30 bg-success/[0.04]"
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
