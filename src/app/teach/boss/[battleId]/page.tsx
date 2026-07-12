/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft, Users, Target, Clock, Swords } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { BOSS_TIERS, type BossTier } from "@/lib/game";

export const metadata = { title: "Boss-Kampf Details" };

export default async function TeachBossDetailPage({
  params,
}: {
  params: Promise<{ battleId: string }>;
}) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const { battleId } = await params;

  const battle = await prisma.bossBattle.findFirst({
    where: { id: battleId, createdByUserId: session.userId },
    include: {
      questions: { orderBy: { createdAt: "asc" } },
      participants: {
        orderBy: { damage: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!battle) notFound();

  const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
  const tierData = BOSS_TIERS[tier];
  const hpPct = Math.round((battle.currentHp / battle.maxHp) * 100);

  const now = new Date();
  const isScheduled = battle.startAt > now && !battle.isActive;
  const isDefeated  = battle.currentHp <= 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Header */}
      <div>
        <Link href="/teach/boss" className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" /> Alle Kämpfe
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{battle.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black">{battle.name}</h1>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase" style={{ color: tierData.color, background: `${tierData.color}18` }}>
                {tierData.label}
              </span>
            </div>
            {battle.subject && (
              <p className="text-sm text-muted-fg">{battle.subject}{battle.gradeLevel ? ` · Klasse ${battle.gradeLevel}` : ""}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status + HP */}
      <section className="rounded-2xl border border-border bg-bg p-5 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-muted-fg">HP</span>
          <span className="font-mono text-xs">{battle.currentHp} / {battle.maxHp}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${hpPct}%`, backgroundColor: isDefeated ? "#6b7280" : tierData.color }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="font-mono text-lg font-black">{battle.participants.length}</p>
            <p className="text-muted-fg">Kämpfer</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="font-mono text-lg font-black">{battle.questions.length}</p>
            <p className="text-muted-fg">Fragen</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="font-mono text-lg font-black">{Math.round((battle.maxHp - battle.currentHp))} </p>
            <p className="text-muted-fg">Schaden gesamt</p>
          </div>
        </div>

        <div className="flex gap-2 text-xs text-muted-fg border-t border-border pt-3">
          <Clock className="size-3.5 shrink-0 mt-0.5" />
          <span>
            {isScheduled ? `Startet ${battle.startAt.toLocaleString("de-DE")}` : `Gestartet ${battle.startAt.toLocaleString("de-DE")}`}
            {battle.endAt && ` · Endet ${battle.endAt.toLocaleString("de-DE")}`}
          </span>
        </div>

        {battle.lore && (
          <blockquote className="border-l-2 pl-3 text-sm italic text-muted-fg" style={{ borderColor: tierData.color }}>
            {battle.lore}
          </blockquote>
        )}
      </section>

      {/* Questions */}
      {battle.questions.length > 0 && (
        <section className="rounded-2xl border border-border bg-bg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-muted-fg" />
            <h2 className="text-sm font-bold">Fragen ({battle.questions.length})</h2>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {battle.questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-border bg-surface p-3">
                <p className="text-sm font-semibold">{i + 1}. {q.question}</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1 text-xs text-muted-fg">
                  {([q.optionA, q.optionB, q.optionC, q.optionD] as const).map((opt, li) => (
                    <span key={li} className={li === q.correct ? "font-bold text-success" : ""}>
                      {String.fromCharCode(65 + li)}) {opt}
                    </span>
                  ))}
                </div>
                {q.aiGenerated && (
                  <span className="mt-1 inline-block rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">KI</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard */}
      {battle.participants.length > 0 && (
        <section className="rounded-2xl border border-border bg-bg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-fg" />
            <h2 className="text-sm font-bold">Teilnehmer</h2>
          </div>
          <div className="space-y-1.5">
            {battle.participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                <span className="w-5 text-center text-xs font-black text-muted-fg">{i + 1}</span>
                <span className="flex-1 font-semibold">{p.user.name}</span>
                {p.isMvp && <span className="text-xs font-black text-yellow-500">MVP 👑</span>}
                {p.firstBlood && <span className="text-xs font-bold text-red-400">⚔️ First</span>}
                <span className="font-mono text-xs text-muted-fg">{p.damage} HP</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!battle.isActive && !isDefeated && (
          <form action={async () => {
            "use server";
            await prisma.bossBattle.update({ where: { id: battleId }, data: { isActive: true } });
            revalidatePath(`/teach/boss/${battleId}`);
          }}>
            <button type="submit" className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2 text-sm font-bold text-success hover:bg-success/20">
              <Swords className="size-4" /> Kampf aktivieren
            </button>
          </form>
        )}
        {battle.isActive && (
          <form action={async () => {
            "use server";
            await prisma.bossBattle.update({ where: { id: battleId }, data: { isActive: false } });
            revalidatePath(`/teach/boss/${battleId}`);
          }}>
            <button type="submit" className="rounded-xl bg-danger/10 px-4 py-2 text-sm font-bold text-danger hover:bg-danger/20">
              Kampf stoppen
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
