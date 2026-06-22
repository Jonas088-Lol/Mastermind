"use client";
/**
 * BossCard — Compact boss card with rarity frame, stats, lore, and renderer.
 * Used in the BossCompendium grid and on the boss fight page.
 */

import { BossRenderer } from "./BossRenderer";
import type { BossDef } from "@/lib/boss-defs";
import { RARITY_COLOR, RARITY_LABEL, scaledStats } from "@/lib/boss-defs";

// ── Rarity frame style ────────────────────────────────────────────────────────
const RARITY_FRAME: Record<string, { border: string; shadow: string; bg: string; badge: string }> = {
  COMMON:    { border: "#6b7280", shadow: "0 0 0px #6b7280",       bg: "#111111", badge: "bg-gray-600"   },
  UNCOMMON:  { border: "#22c55e", shadow: "0 0 8px #22c55e55",    bg: "#0a1a0a", badge: "bg-green-600"  },
  RARE:      { border: "#3b82f6", shadow: "0 0 12px #3b82f655",   bg: "#0a0a1f", badge: "bg-blue-600"   },
  EPIC:      { border: "#a855f7", shadow: "0 0 16px #a855f755",   bg: "#12001f", badge: "bg-purple-600" },
  LEGENDARY: { border: "#f97316", shadow: "0 0 20px #f9731677",   bg: "#1a0a00", badge: "bg-orange-600" },
  MYTHIC:    { border: "#ef4444", shadow: "0 0 24px #ef444477",   bg: "#1a0000", badge: "bg-red-700"    },
  SECRET:    { border: "#fcd34d", shadow: "0 0 28px #fcd34daa",   bg: "#1a1200", badge: "bg-yellow-600" },
};

interface BossCardProps {
  boss: BossDef;
  grade?: number;
  /** Whether the student has defeated this boss */
  defeated?: boolean;
  /** Whether to show as locked/undiscovered */
  locked?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export function BossCard({ boss, grade = 8, defeated, locked, onClick, size = "md" }: BossCardProps) {
  const frame   = RARITY_FRAME[boss.rarity] ?? RARITY_FRAME.COMMON!;
  const stats   = scaledStats(boss, grade);
  const color   = RARITY_COLOR[boss.rarity as keyof typeof RARITY_COLOR] ?? "#6b7280";
  const label   = RARITY_LABEL[boss.rarity as keyof typeof RARITY_LABEL] ?? boss.rarity;

  const rendererSize = size === "sm" ? 72 : size === "lg" ? 160 : 110;
  const cardPx       = size === "sm" ? "p-2" : size === "lg" ? "p-5" : "p-3";

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center rounded-xl transition-transform hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer select-none ${cardPx}`}
      style={{
        background:  frame.bg,
        border:      `2px solid ${locked ? "#374151" : frame.border}`,
        boxShadow:   locked ? "none" : frame.shadow,
        opacity:     locked ? 0.55 : 1,
        minWidth:    size === "sm" ? 100 : size === "lg" ? 220 : 160,
      }}
      aria-label={`${boss.name} — ${label}`}
    >
      {/* Rarity badge */}
      <span
        className={`absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${frame.badge}`}
        style={{ fontSize: 9 }}>
        {label}
      </span>

      {/* Defeated checkmark */}
      {defeated && (
        <span className="absolute top-1.5 left-1.5 text-green-400 text-base leading-none"
          title="Besiegt">✓</span>
      )}

      {/* Boss renderer */}
      <div className="relative" style={{ width: rendererSize, height: rendererSize }}>
        {locked ? (
          <div className="w-full h-full flex items-center justify-center text-gray-600"
            style={{ fontSize: rendererSize * 0.5 }}>?</div>
        ) : (
          <BossRenderer boss={boss} size={rendererSize} animated={size !== "sm"} />
        )}
      </div>

      {/* Name */}
      <p className="mt-1 font-bold text-center leading-tight"
        style={{
          color,
          fontSize: size === "sm" ? 11 : size === "lg" ? 16 : 13,
          maxWidth: rendererSize + 16,
          wordBreak: "break-word",
        }}>
        {locked ? "???" : boss.name}
      </p>

      {/* Subject + emoji */}
      {!locked && (
        <p className="text-gray-400 text-center" style={{ fontSize: size === "sm" ? 9 : 11 }}>
          {boss.emoji} {boss.subject}
        </p>
      )}

      {/* Stats row */}
      {!locked && size !== "sm" && (
        <div className="mt-2 flex gap-3 text-center">
          <StatPill label="HP"    value={stats.hp.toLocaleString("de")} color="#ef4444" />
          <StatPill label="XP"    value={stats.xp.toLocaleString("de")} color="#f59e0b" />
          <StatPill label="Coins" value={stats.coins.toLocaleString("de")} color="#22c55e" />
        </div>
      )}

      {/* Lore text */}
      {!locked && size === "lg" && (
        <p className="mt-3 text-gray-400 text-center text-xs leading-relaxed px-1"
          style={{ maxWidth: 200 }}>
          {boss.loreShort}
        </p>
      )}

      {/* Grade range badge */}
      {!locked && size !== "sm" && (
        <span className="mt-1.5 text-gray-500" style={{ fontSize: 10 }}>
          Klasse {boss.minGrade}–{boss.maxGrade}
        </span>
      )}
    </button>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono font-bold text-sm" style={{ color }}>{value}</span>
      <span className="text-gray-500 uppercase tracking-wider" style={{ fontSize: 9 }}>{label}</span>
    </div>
  );
}
