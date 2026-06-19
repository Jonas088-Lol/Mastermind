import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
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
      participants: {
        where: { userId: session.userId },
      },
    },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Boss-Battles</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {activeBattles.length > 0
            ? `${activeBattles.length} aktiver Boss — greift gemeinsam an!`
            : "Kein aktiver Boss — schau bald wieder vorbei"}
        </p>
      </header>

      {/* Info cards */}
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        {[
          { icon: "👾", title: "Gemeinsam kämpfen", text: "Jede richtige Antwort verursacht 1 HP Schaden. Je mehr Schüler mitmachen, desto schneller stirbt der Boss." },
          { icon: "🏆", title: "MVP & Boni", text: "First Blood (+10 Münzen), Last Hit (+15), MVP (3× Belohnung) — kämpfe für deinen Platz ganz oben." },
          { icon: "🎁", title: "Belohnungen", text: "XP und Münzen werden nach Schaden aufgeteilt. Seltenere Bosses = höhere Belohnungen für alle." },
        ].map((info) => (
          <div key={info.title} className="bg-bg p-5">
            <div className="mb-2 text-2xl">{info.icon}</div>
            <p className="text-sm font-bold">{info.title}</p>
            <p className="mt-1 text-xs text-muted-fg leading-relaxed">{info.text}</p>
          </div>
        ))}
      </div>

      {/* Tier reference */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(BOSS_TIERS) as [BossTier, typeof BOSS_TIERS[BossTier]][]).map(([key, t]) => (
          <span
            key={key}
            className="rounded-full border px-2.5 py-1 text-xs font-bold"
            style={{ borderColor: `${t.color}60`, color: t.color, backgroundColor: `${t.color}10` }}
          >
            {t.label} · {t.hp} HP
          </span>
        ))}
      </div>

      {activeBattles.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <span className="text-5xl">😴</span>
            <p className="mt-4 text-lg font-bold">Kein Boss momentan aktiv</p>
            <p className="mt-1 text-sm text-muted-fg">Alle 3 Stunden spawnt automatisch ein neuer Boss</p>
          </CardBody>
        </Card>
      ) : (
        activeBattles.map((battle) => {
          const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
          const tierData = BOSS_TIERS[tier];
          const myParticipation = battle.participants.find((p) => p.userId === session.userId);
          const totalParticipants = battle.participants.length;
          const timeLeft = battle.endAt.getTime() - Date.now();
          const hoursLeft = Math.max(0, Math.floor(timeLeft / 3_600_000));
          const minutesLeft = Math.max(0, Math.floor((timeLeft % 3_600_000) / 60_000));

          return (
            <div
              key={battle.id}
              className={cn(
                "rounded-3xl border-2 bg-bg p-6 shadow-xl",
                tierData.border,
                `shadow-[0_0_40px_0_${tierData.color}22]`,
              )}
            >
              {/* Header */}
              <div className="flex items-start gap-4">
                <span className="shrink-0 text-5xl leading-none drop-shadow-lg">{battle.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">{battle.name}</h2>
                    <span
                      className="rounded-full border px-2 py-0.5 text-xs font-bold"
                      style={{ borderColor: `${tierData.color}60`, color: tierData.color, backgroundColor: `${tierData.color}15` }}
                    >
                      {tierData.label}
                    </span>
                    {battle.subject && <Badge variant="outline">{battle.subject}</Badge>}
                    {battle.gradeLevel && <Badge variant="outline">Klasse {battle.gradeLevel}</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-fg">{battle.description}</p>
                  {battle.lore && (
                    <p className="mt-2 border-l-2 pl-3 text-xs italic text-muted-fg/70" style={{ borderColor: tierData.color }}>
                      {battle.lore}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
                    <span className="flex items-center gap-1"><Users className="size-3" /> {totalParticipants} Teilnehmer</span>
                    {timeLeft > 0 && (
                      <span>
                        Endet in{" "}
                        <span className="font-semibold text-fg">
                          {hoursLeft > 0 ? `${hoursLeft}h ` : ""}{minutesLeft}min
                        </span>
                      </span>
                    )}
                    <span>
                      Belohnung: <span className="font-semibold text-fg">{tierData.xpReward} XP</span>
                      {" / "}MVP: <span className="font-semibold text-fg">{tierData.mvpCoinReward} Münzen</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive HP bar + attack — BossClient */}
              <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
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
                <div className="mt-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">Schaden-Ranking</h3>
                  <ol className="space-y-1.5">
                    {battle.participants.slice(0, 5).map((p, i) => {
                      const isMe = p.userId === session.userId;
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                      return (
                        <li
                          key={p.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2",
                            isMe ? "bg-brand/8 border border-brand/20" : "bg-surface",
                          )}
                        >
                          <span className="w-6 text-center font-mono text-sm font-bold text-muted-fg">
                            {medal ?? `#${i + 1}`}
                          </span>
                          <Avatar name={p.user.name} size="sm" />
                          <span className={cn("flex-1 text-sm font-medium", isMe && "font-bold")}>
                            {p.user.name}{isMe && " (Du)"}
                          </span>
                          <span className="font-mono text-sm font-bold" style={{ color: tierData.color }}>
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
        })
      )}

      {/* Past battles */}
      {pastBattles.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">Meine Kämpfe</h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {pastBattles.map((battle) => {
              const myPart = battle.participants[0];
              const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
              const tierData = BOSS_TIERS[tier];
              return (
                <div key={battle.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="text-2xl">{battle.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{battle.name}</p>
                    <p className="text-xs text-muted-fg">
                      {battle.endAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span
                    className="rounded-full border px-2 py-0.5 text-xs font-bold shrink-0"
                    style={{ borderColor: `${tierData.color}60`, color: tierData.color, backgroundColor: `${tierData.color}10` }}
                  >
                    {tierData.label}
                  </span>
                  <Badge variant="success" className="shrink-0">Besiegt</Badge>
                  {myPart && myPart.damage > 0 && (
                    <span className="font-mono text-sm font-bold text-danger shrink-0">{myPart.damage} DMG</span>
                  )}
                  {myPart?.isMvp && (
                    <span className="text-sm shrink-0">👑</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
