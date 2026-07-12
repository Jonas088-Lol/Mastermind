/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";
/**
 * BossCompendium — Full 75-boss bestiary catalog.
 * Filters by subject, rarity, and defeat status. Grid of BossCards.
 */

import { useState, useMemo } from "react";
import { BossCard } from "./BossCard";
import type { BossDef, BossRarity } from "@/lib/boss-defs";
import { ALL_BOSSES, RARITY_COLOR, RARITY_LABEL } from "@/lib/boss-defs";

type SortKey = "rarity" | "subject" | "grade" | "name";

const RARITY_ORDER: Record<string, number> = {
  COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHIC: 5, SECRET: 6,
};

const ALL_SUBJECTS = [...new Set(ALL_BOSSES.map((b) => b.subject))].sort();
const ALL_RARITIES: BossRarity[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "SECRET"];

interface Props {
  /** IDs of bosses the user has beaten */
  defeatedIds?: Set<string>;
  /** IDs of bosses that are unlocked/visible (defaults to all visible) */
  unlockedIds?: Set<string>;
  /** Player's current grade for stat scaling */
  grade?: number;
  /** Called when a card is clicked */
  onSelect?: (boss: BossDef) => void;
}

export function BossCompendium({ defeatedIds, unlockedIds, grade = 8, onSelect }: Props) {
  const [subject,  setSubject]  = useState<string>("all");
  const [rarity,   setRarity]   = useState<string>("all");
  const [sortBy,   setSortBy]   = useState<SortKey>("rarity");
  const [showOnly, setShowOnly] = useState<"all" | "defeated" | "undefeated">("all");
  const [search,   setSearch]   = useState("");

  const filtered = useMemo(() => {
    let list = [...ALL_BOSSES];

    if (subject !== "all") list = list.filter((b) => b.subject === subject);
    if (rarity  !== "all") list = list.filter((b) => b.rarity  === rarity);
    if (search.trim())     list = list.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.subject.toLowerCase().includes(search.toLowerCase())
    );
    if (showOnly === "defeated")   list = list.filter((b) => defeatedIds?.has(b.id));
    if (showOnly === "undefeated") list = list.filter((b) => !defeatedIds?.has(b.id));

    list.sort((a, b) => {
      if (sortBy === "rarity")  return RARITY_ORDER[b.rarity]! - RARITY_ORDER[a.rarity]!;
      if (sortBy === "subject") return a.subject.localeCompare(b.subject) || RARITY_ORDER[b.rarity]! - RARITY_ORDER[a.rarity]!;
      if (sortBy === "grade")   return a.minGrade - b.minGrade;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [subject, rarity, sortBy, showOnly, search, defeatedIds]);

  const defeatedCount = defeatedIds?.size ?? 0;
  const totalCount    = ALL_BOSSES.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header stats */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs text-muted-fg uppercase tracking-wider">Bestiarium</p>
          <h1 className="text-2xl font-black">Boss-Kompendium</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-yellow-400">{defeatedCount}</span>
          <span className="text-muted-fg text-sm">/ {totalCount} besiegt</span>
          <div className="h-2 w-24 rounded-full bg-white/10 overflow-hidden ml-1">
            <div className="h-full bg-yellow-400 rounded-full transition-all"
              style={{ width: `${Math.round(defeatedCount / totalCount * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Rarity progress bars */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {ALL_RARITIES.map((r) => {
          const total    = ALL_BOSSES.filter((b) => b.rarity === r).length;
          const defeated = ALL_BOSSES.filter((b) => b.rarity === r && defeatedIds?.has(b.id)).length;
          const color    = RARITY_COLOR[r as keyof typeof RARITY_COLOR];
          return (
            <button key={r}
              onClick={() => setRarity(rarity === r ? "all" : r)}
              className="flex flex-col items-center rounded-lg border p-2 transition-colors"
              style={{
                borderColor: rarity === r ? color : `${color}33`,
                background:  rarity === r ? `${color}15` : "transparent",
              }}>
              <span className="font-mono font-bold text-sm" style={{ color }}>
                {defeated}/{total}
              </span>
              <span className="text-[9px] uppercase tracking-wide text-muted-fg mt-0.5">
                {RARITY_LABEL[r as keyof typeof RARITY_LABEL]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <input
          type="text"
          placeholder="Boss suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm outline-none focus:border-brand/60 min-w-0 flex-1 sm:max-w-[180px]"
        />

        {/* Subject filter */}
        <select value={subject} onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm cursor-pointer">
          <option value="all">Alle Fächer</option>
          {ALL_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm cursor-pointer">
          <option value="rarity">Seltenheit</option>
          <option value="subject">Fach</option>
          <option value="grade">Klassenstufe</option>
          <option value="name">Name</option>
        </select>

        {/* Defeat status */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "defeated", "undefeated"] as const).map((v) => (
            <button key={v} onClick={() => setShowOnly(v)}
              className="px-2.5 py-1.5 text-xs font-semibold transition-colors"
              style={{ background: showOnly === v ? "var(--color-brand)" : "transparent",
                       color: showOnly === v ? "white" : "var(--color-muted-fg)" }}>
              {v === "all" ? "Alle" : v === "defeated" ? "Besiegt" : "Offen"}
            </button>
          ))}
        </div>

        {/* Result count */}
        <span className="ml-auto self-center text-xs text-muted-fg">
          {filtered.length} von {totalCount}
        </span>
      </div>

      {/* Boss grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-fg">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">Keine Bosse gefunden</p>
          <p className="text-sm mt-1">Ändere deine Filter oder suche nach etwas anderem</p>
        </div>
      ) : (
        <div className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {filtered.map((boss) => {
            const isLocked = boss.rarity === "SECRET" && !defeatedIds?.has(boss.id) && !unlockedIds?.has(boss.id);
            return (
              <BossCard
                key={boss.id}
                boss={boss}
                grade={grade}
                defeated={defeatedIds?.has(boss.id)}
                locked={isLocked}
                onClick={() => onSelect?.(boss)}
                size="md"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
