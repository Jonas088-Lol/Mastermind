import Link from "next/link";
import { Swords } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { BOSS_TIERS, type BossTier } from "@/lib/game";

export async function BossBar() {
  const session = await getSession();
  if (!session) return null;

  const battle = await prisma.bossBattle.findFirst({
    where: {
      isActive: true,
      currentHp: { gt: 0 },
      OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }],
    },
    orderBy: { startAt: "asc" },
  });

  if (!battle) return null;

  const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
  const tierData = BOSS_TIERS[tier];
  const hpPct = Math.round((battle.currentHp / battle.maxHp) * 100);

  return (
    <Link
      href="/app/boss"
      className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-2 transition-colors hover:bg-surface-2"
    >
      <span className="text-lg leading-none">{battle.icon}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-black leading-none"
          style={{ borderColor: `${tierData.color}60`, color: tierData.color, backgroundColor: `${tierData.color}15` }}
        >
          {tierData.label.toUpperCase()}
        </span>
        <span className="min-w-0 truncate text-xs font-semibold">{battle.name}</span>
        <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-surface-2 border border-border sm:block">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${hpPct}%`, backgroundColor: tierData.color }}
          />
        </div>
        <span className="shrink-0 text-[10px] font-mono font-bold text-muted-fg">
          {battle.currentHp}/{battle.maxHp} HP
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold"
        style={{ borderColor: `${tierData.color}60`, color: tierData.color }}
      >
        <Swords className="size-3" />
        Angreifen
      </span>
    </Link>
  );
}
