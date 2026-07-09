import Link from "next/link";
import { Plus, Swords } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { BOSS_TIERS, type BossTier } from "@/lib/game";

export const metadata = { title: "Boss-Kämpfe" };

export default async function TeachBossPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/login");

  const battles = await prisma.bossBattle.findMany({
    where: { createdByUserId: session.userId },
    orderBy: { startAt: "desc" },
    include: {
      _count: { select: { participants: true, questions: true } },
    },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-fg">Lehrer</p>
          <h1 className="mt-1 text-2xl font-black">Boss-Kämpfe</h1>
          <p className="mt-1 text-sm text-muted-fg">Deine erstellten Bosskämpfe</p>
        </div>
        <Link
          href="/teach/boss/neu"
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand/90"
        >
          <Plus className="size-4" />
          Neu
        </Link>
      </header>

      {battles.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Swords className="size-10 text-muted-fg/40" />
          <p className="font-semibold text-muted-fg">Noch keine Kämpfe erstellt</p>
          <Link href="/teach/boss/neu" className="rounded-lg bg-brand/10 px-4 py-2 text-sm font-bold text-brand hover:bg-brand/20">
            Ersten Kampf erstellen
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {battles.map((b) => {
            const tier = (b.tier as BossTier) in BOSS_TIERS ? b.tier as BossTier : "common";
            const tierData = BOSS_TIERS[tier];
            const now = new Date();
            const status = b.isActive ? "active"
              : b.currentHp <= 0 ? "defeated"
              : b.startAt > now ? "scheduled"
              : "ended";

            const statusBadge = {
              active:    { label: "Aktiv",     cls: "bg-success/10 text-success" },
              defeated:  { label: "Besiegt",   cls: "bg-muted/10 text-muted-fg" },
              scheduled: { label: "Geplant",   cls: "bg-brand/10 text-brand" },
              ended:     { label: "Beendet",   cls: "bg-muted/10 text-muted-fg" },
            }[status];

            return (
              <Link
                key={b.id}
                href={`/teach/boss/${b.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-bg p-4 transition-all hover:border-border/80 hover:shadow-sm"
              >
                <span className="text-3xl">{b.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold truncate">{b.name}</p>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase" style={{ color: tierData.color, background: `${tierData.color}18` }}>
                      {tierData.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge.cls}`}>{statusBadge.label}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-fg">
                    <span>HP: {b.currentHp}/{b.maxHp}</span>
                    <span>·</span>
                    <span>{b._count.participants} Kämpfer</span>
                    {b.useCustomQuestions && (
                      <>
                        <span>·</span>
                        <span>{b._count.questions} Fragen</span>
                      </>
                    )}
                  </div>
                  {b.subject && (
                    <p className="mt-0.5 text-[11px] text-muted-fg">{b.subject}{b.gradeLevel ? ` · Klasse ${b.gradeLevel}` : ""}</p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-fg shrink-0">
                  <p>{b.startAt.toLocaleDateString("de-DE")}</p>
                  {b.endAt && <p className="text-[10px]">bis {b.endAt.toLocaleDateString("de-DE")}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
