import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { LOGIN_REWARD_SCHEDULE } from "@/lib/game";
import { cn } from "@/lib/utils";
import { claimDailyLoginReward } from "./actions";

export const metadata: Metadata = { title: "Tagesbonus · MasterMind" };

export default async function TagesbelohnungPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const today = new Date().toISOString().slice(0, 10);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lastLoginDate: true, totalDailyLogins: true, xp: true },
  });

  const alreadyClaimed = user?.lastLoginDate === today;
  const totalLogins = user?.totalDailyLogins ?? 0;
  const dayInCycle = totalLogins === 0 ? 1 : ((totalLogins - 1) % LOGIN_REWARD_SCHEDULE.length) + 1;
  const nextDay = (dayInCycle % LOGIN_REWARD_SCHEDULE.length) + 1;
  const todayReward = LOGIN_REWARD_SCHEDULE.find((r) => r.day === (alreadyClaimed ? dayInCycle : nextDay === 1 && !alreadyClaimed ? 1 : dayInCycle))
    ?? LOGIN_REWARD_SCHEDULE[0];

  const recentRewards = await prisma.dailyLoginReward.findMany({
    where: { userId: session.userId },
    orderBy: { claimedAt: "desc" },
    take: 14,
    select: { day: true, xpAwarded: true, claimedAt: true },
  });

  // Which day index is "today's claimable" vs "already claimed"
  const claimableDay = alreadyClaimed ? null : (totalLogins === 0 ? 1 : ((totalLogins) % LOGIN_REWARD_SCHEDULE.length) + 1);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Tägliche Belohnung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Tagesbonus</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {totalLogins} Tage angemeldet · Tag {dayInCycle} im Zyklus
        </p>
      </header>

      {/* Claim card */}
      <Card className={cn(alreadyClaimed ? "border-border" : "border-warning/40 bg-warning/[0.02]")}>
        <CardBody className="flex flex-col items-center gap-6 py-10 text-center">
          {alreadyClaimed ? (
            <>
              <CheckCircle2 className="size-12 text-success" strokeWidth={1.5} />
              <div>
                <p className="text-lg font-bold">Heute bereits eingelöst!</p>
                <p className="mt-1 text-sm text-muted-fg">Komm morgen wieder für deinen nächsten Bonus</p>
              </div>
            </>
          ) : (
            <>
              <Sun className="size-12 text-warning" strokeWidth={1.5} />
              <div>
                <p className="text-lg font-bold">Tagesbonus verfügbar!</p>
                <p className="mt-1 text-sm text-muted-fg">Tag {claimableDay} · +{LOGIN_REWARD_SCHEDULE[(claimableDay ?? 1) - 1]?.xp ?? 20} XP</p>
                {LOGIN_REWARD_SCHEDULE[(claimableDay ?? 1) - 1]?.bonus && (
                  <p className="mt-1 text-xs font-semibold text-warning">
                    {LOGIN_REWARD_SCHEDULE[(claimableDay ?? 1) - 1]?.bonus}
                  </p>
                )}
              </div>
              <form action={claimDailyLoginReward}>
                <Button size="lg" variant="secondary">
                  <Sun className="size-4 text-warning" />
                  Tagesbonus einlösen
                </Button>
              </form>
            </>
          )}
        </CardBody>
      </Card>

      {/* 7-day cycle */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-fg">7-Tage-Zyklus</h2>
        <div className="grid grid-cols-7 gap-1">
          {LOGIN_REWARD_SCHEDULE.map((reward) => {
            const isPast = reward.day < dayInCycle && alreadyClaimed;
            const isToday = reward.day === claimableDay;
            const isFuture = !isPast && !isToday;

            return (
              <div
                key={reward.day}
                className={cn(
                  "flex flex-col items-center gap-1.5 border p-2 text-center",
                  isToday  && "border-warning/60 bg-warning/[0.06]",
                  isPast   && "border-success/30 bg-success/[0.04] opacity-70",
                  isFuture && "border-border opacity-50",
                )}
              >
                <span className="text-lg leading-none">{reward.icon}</span>
                <span className="text-[10px] font-semibold text-muted-fg">T{reward.day}</span>
                <span className="font-mono text-[10px] font-bold text-warning">+{reward.xp}</span>
                {isPast && <CheckCircle2 className="size-3 text-success" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* History */}
      {recentRewards.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">Verlauf</h2>
          <div className="divide-y divide-border border border-border">
            {recentRewards.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-base">{LOGIN_REWARD_SCHEDULE.find((s) => s.day === r.day)?.icon ?? "☀️"}</span>
                  <div>
                    <p className="text-sm font-medium">Tag {r.day}</p>
                    <p className="text-xs text-muted-fg">
                      {r.claimedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-success">+{r.xpAwarded} XP</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
