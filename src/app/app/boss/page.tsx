import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, BookOpen, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { cn } from "@/lib/utils";
import { BossClient } from "./BossClient";

export const metadata: Metadata = { title: "Boss-Battle · MasterMind" };

export default async function BossPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const activeBattles = await prisma.bossBattle.findMany({
    where: {
      isActive: true,
      currentHp: { gt: 0 },
      OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }],
    },
    include: {
      participants: {
        orderBy: { damage: "desc" },
        take: 10,
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const pastBattles = await prisma.bossBattle.findMany({
    where: {
      isActive: false,
      currentHp: 0,
      OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }],
      participants: { some: { userId: session.userId } },
    },
    take: 6,
    orderBy: { endAt: "desc" },
    include: {
      participants: { where: { userId: session.userId } },
    },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Boss-Battles</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {activeBattles.length > 0
            ? `${activeBattles.length} aktiver Gegner — kämpft gemeinsam!`
            : "Kein aktiver Boss — schau bald wieder vorbei"}
        </p>
      </header>

      {/* Quick links */}
      <div className="flex gap-2">
        <Link
          href="/app/boss/index"
          className="flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold text-muted-fg transition-colors hover:border-fg/30 hover:text-fg"
        >
          <BookOpen className="size-3.5" /> Boss-Index
        </Link>
        <Link
          href="/app/boss/bestiary"
          className="flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold text-muted-fg transition-colors hover:border-fg/30 hover:text-fg"
        >
          <Swords className="size-3.5" /> Statistiken
        </Link>
      </div>

      {/* No active boss */}
      {activeBattles.length === 0 && (
        <Card>
          <CardBody className="py-16 text-center">
            <span className="text-6xl">😴</span>
            <p className="mt-4 text-xl font-bold">Kein Boss aktiv</p>
            <p className="mt-1 text-sm text-muted-fg">Alle paar Stunden spawnt automatisch ein neuer Boss</p>
          </CardBody>
        </Card>
      )}

      {/* Active battles */}
      {activeBattles.map((battle) => {
        const tier = (battle.tier as BossTier) in BOSS_TIERS ? (battle.tier as BossTier) : "common";
        const tierData = BOSS_TIERS[tier];
        const color = tierData.color;
        const myParticipation = battle.participants.find((p) => p.userId === session.userId);
        const totalParticipants = battle.participants.length;
        const timeLeft = battle.endAt.getTime() - Date.now();
        const hoursLeft = Math.max(0, Math.floor(timeLeft / 3_600_000));
        const minutesLeft = Math.max(0, Math.floor((timeLeft % 3_600_000) / 60_000));

        return (
          <div
            key={battle.id}
            className="relative overflow-hidden rounded-3xl border-2"
            style={{
              borderColor: `${color}55`,
              background: `linear-gradient(160deg, ${color}0c 0%, transparent 55%)`,
              boxShadow: `0 0 60px 0 ${color}18, 0 16px 40px rgba(0,0,0,0.25)`,
            }}
          >
            {/* Ambient glow blob */}
            <div
              className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full"
              style={{ background: `radial-gradient(circle, ${color}14 0%, transparent 70%)` }}
            />

            {/* Boss info */}
            <div className="relative p-6 pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full border-2 px-3 py-0.5 text-xs font-black uppercase tracking-wider"
                  style={{ borderColor: color, color, backgroundColor: `${color}15` }}
                >
                  {tierData.label}
                </span>
                {battle.subject && <Badge variant="outline" className="text-xs">{battle.subject}</Badge>}
                {battle.gradeLevel && <Badge variant="outline" className="text-xs">Klasse {battle.gradeLevel}</Badge>}
              </div>

              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">{battle.name}</h2>

              {battle.lore && (
                <p
                  className="mt-2 border-l-2 pl-3 text-xs italic text-muted-fg/65 leading-relaxed"
                  style={{ borderColor: color }}
                >
                  {battle.lore}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-fg">
                <span className="flex items-center gap-1">
                  <Users className="size-3" /> {totalParticipants} Kämpfer
                </span>
                {timeLeft > 0 && (
                  <span>
                    ⏳ Endet in{" "}
                    <span className="font-semibold text-fg">
                      {hoursLeft > 0 ? `${hoursLeft}h ` : ""}{minutesLeft}min
                    </span>
                  </span>
                )}
                <span>
                  MVP: <span className="font-semibold text-fg">{tierData.mvpCoinReward} Münzen</span>
                  {" · "}
                  <span className="font-semibold text-fg">{tierData.xpReward} XP</span>
                </span>
              </div>
            </div>

            {/* Interactive arena */}
            <div className="relative p-6">
              <BossClient
                battleId={battle.id}
                tier={tier}
                bossName={battle.name}
                bossIcon={battle.icon}
                initialHp={battle.currentHp}
                maxHp={battle.maxHp}
                myCorrectAnswers={myParticipation?.correctAnswers ?? 0}
              />
            </div>

            {/* Leaderboard */}
            {battle.participants.length > 0 && (
              <div
                className="relative border-t p-6 pt-4"
                style={{ borderColor: `${color}25` }}
              >
                <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-fg">
                  ⚔️ Schaden-Ranking
                </h3>
                <ol className="space-y-1.5">
                  {battle.participants.slice(0, 5).map((p, i) => {
                    const isMe = p.userId === session.userId;
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                    return (
                      <li
                        key={p.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2",
                          isMe ? "border" : "bg-surface/40",
                        )}
                        style={isMe ? { borderColor: `${color}30`, backgroundColor: `${color}08` } : undefined}
                      >
                        <span className="w-6 shrink-0 text-center font-mono text-sm font-bold text-muted-fg">
                          {medal ?? `#${i + 1}`}
                        </span>
                        <Avatar name={p.user.name} size="sm" />
                        <span className={cn("flex-1 text-sm font-medium truncate", isMe && "font-bold")}>
                          {p.user.name}{isMe && " (Du)"}
                        </span>
                        <span className="shrink-0 font-mono text-sm font-black" style={{ color }}>
                          {p.damage.toLocaleString("de-DE")} DMG
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        );
      })}

      {/* Past battles */}
      {pastBattles.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-fg">Meine Kämpfe</h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {pastBattles.map((battle) => {
              const myPart = battle.participants[0];
              const tier = (battle.tier as BossTier) in BOSS_TIERS ? (battle.tier as BossTier) : "common";
              const tierData = BOSS_TIERS[tier];
              return (
                <div key={battle.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="text-xl shrink-0">{battle.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{battle.name}</p>
                    <p className="text-xs text-muted-fg">
                      {battle.endAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black"
                    style={{ borderColor: `${tierData.color}55`, color: tierData.color, backgroundColor: `${tierData.color}10` }}
                  >
                    {tierData.label}
                  </span>
                  <Badge variant="success" className="shrink-0 text-[10px]">Besiegt</Badge>
                  {myPart && myPart.damage > 0 && (
                    <span className="shrink-0 font-mono text-sm font-bold text-danger">{myPart.damage} DMG</span>
                  )}
                  {myPart?.isMvp && <span className="shrink-0">👑</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
