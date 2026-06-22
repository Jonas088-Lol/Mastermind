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
      className="flex shrink-0 flex-col gap-1.5 border-b border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2"
    >
      {/* Row 1 (mobile) / single row (desktop) */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-base leading-none sm:text-lg">{battle.icon}</span>
        <span
          className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-black leading-none sm:text-[10px]"
          style={{ borderColor: `${tierData.color}60`, color: tierData.color, backgroundColor: `${tierData.color}15` }}
        >
          {tierData.label.toUpperCase()}
        </span>
        <span className="min-w-0 truncate text-xs font-semibold">{battle.name}</span>
        <span className="ml-auto shrink-0 font-mono text-[10px] font-bold text-muted-fg sm:ml-0">
          {battle.currentHp.toLocaleString("de-DE")}/{battle.maxHp.toLocaleString("de-DE")} HP
        </span>
        <span
          className="hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold sm:flex"
          style={{ borderColor: `${tierData.color}60`, color: tierData.color }}
        >
          <Swords className="size-3" />
          Angreifen
        </span>
      </div>

      {/* HP bar — always visible */}
      <div className="flex items-center gap-2 sm:flex-1 sm:max-w-xs">
        <div className="h-2 flex-1 overflow-hidden rounded-full border border-border bg-surface-2">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${hpPct}%`, backgroundColor: tierData.color }}
          />
        </div>
        <span
          className="shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold sm:hidden flex"
          style={{ borderColor: `${tierData.color}60`, color: tierData.color }}
        >
          <Swords className="size-3" />
          Kämpfen
        </span>
      </div>
    </Link>
  );
}
