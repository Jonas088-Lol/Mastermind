import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Flame, Zap } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { levelFromXp, xpToNextLevel, xpProgressInLevel, getRankForXp, formatXp } from "@/lib/game";

export const metadata: Metadata = { title: "XP-Verlauf" };

const REASON_LABEL: Record<string, string> = {
  aufgabe_abgabe: "Aufgabe abgegeben",
  karteikarte: "Karteikarte gelernt",
  karteikarte_session: "Karteikarten-Session",
  note_geteilt: "Notiz geteilt",
  aufgabe_bewertet: "Aufgabe bewertet",
  tages_herausforderung: "Tägliche Herausforderung",
  duel_win: "Duell gewonnen",
  duel_participate: "Duell gespielt",
  daily_challenge: "Tägliche Herausforderung",
  quiz_completed: "Übungsquiz abgeschlossen",
  quest_reward: "Quest-Belohnung eingelöst",
  daily_login_reward: "Tagesbonus eingelöst",
  boss_battle_reward: "Boss besiegt",
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export default async function XpLogPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const [user, logs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { xp: true, streak: true, lastActiveDate: true },
    }),
    prisma.xpLog.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  if (!user) redirect("/login");

  const level = levelFromXp(user.xp);
  const xpToNext = xpToNextLevel(user.xp);
  const progressPct = xpProgressInLevel(user.xp);
  const rank = getRankForXp(user.xp);

  const nextMilestone = STREAK_MILESTONES.find((m) => m > user.streak) ?? null;

  // Group logs by date
  const byDate = new Map<string, typeof logs>();
  for (const log of logs) {
    const key = log.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
    const list = byDate.get(key) ?? [];
    list.push(log);
    byDate.set(key, list);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <header>
        <Link
          href="/app/profil"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Profil
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">XP-Verlauf</h1>
      </header>

      <div className="grid grid-cols-2 gap-px border border-border bg-border">
        <div className="bg-bg p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
            <Zap className="size-3.5" />
            {rank.icon} Level {level} · {rank.nameDE}
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">{formatXp(user.xp)} XP</p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-muted-fg">
              <span>Nächstes Level: {formatXp(xpToNext)} XP</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface">
              <div className="h-1.5 bg-brand" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
        <div className="bg-bg p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
            <Flame className="size-3.5" />
            Streak
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">{user.streak} Tage</p>
          {nextMilestone !== null && (
            <p className="mt-1 text-xs text-muted-fg">Nächster Meilenstein: {nextMilestone} Tage</p>
          )}
        </div>
      </div>

      {STREAK_MILESTONES.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold">Streak-Meilensteine</h2>
          <div className="flex flex-wrap gap-2">
            {STREAK_MILESTONES.map((m) => (
              <div
                key={m}
                className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold ${
                  user.streak >= m
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border text-muted-fg"
                }`}
              >
                <Flame className="size-3" />
                {m} Tage
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold">Verlauf</h2>
        {byDate.size === 0 ? (
          <p className="text-sm text-muted-fg">Noch keine XP-Einträge.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {Array.from(byDate.entries()).map(([date, entries]) => (
              <div key={date}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">{date}</p>
                <div className="divide-y divide-border border border-border">
                  {entries.map((log) => (
                    <div key={log.id} className="flex items-center gap-4 bg-bg px-4 py-3 text-sm">
                      <Zap className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
                      <p className="flex-1">{REASON_LABEL[log.reason] ?? log.reason}</p>
                      <p className="font-mono font-bold text-success">+{log.amount}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
