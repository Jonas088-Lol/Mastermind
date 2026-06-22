"use client";

import { useState } from "react";
import { BossCompendium } from "@/components/boss/BossCompendium";
import { BossCard } from "@/components/boss/BossCard";
import type { BossDef } from "@/lib/boss-defs";
import { RARITY_COLOR } from "@/lib/boss-defs";

interface Props {
  grade: number;
  defeatedIds: string[];
}

export function BossCompendiumWrapper({ grade, defeatedIds }: Props) {
  const [selected, setSelected] = useState<BossDef | null>(null);
  const defeatedSet = new Set(defeatedIds);

  return (
    <>
      <BossCompendium
        grade={grade}
        defeatedIds={defeatedSet}
        onSelect={setSelected}
      />

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
          onClick={() => setSelected(null)}>
          <div className="relative bg-[#0e0e0e] border rounded-2xl max-w-sm w-full p-5"
            style={{ borderColor: RARITY_COLOR[selected.rarity as keyof typeof RARITY_COLOR] + "60" }}
            onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-muted-fg hover:text-fg text-xl leading-none"
              onClick={() => setSelected(null)}>✕</button>
            <BossCard boss={selected} grade={grade} defeated={defeatedSet.has(selected.id)} size="lg" />
          </div>
        </div>
      )}
    </>
  );
}
