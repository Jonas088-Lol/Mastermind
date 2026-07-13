/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Swords, Crown, Droplets, Skull, Target, GraduationCap, Search } from "lucide-react";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { cn } from "@/lib/utils";

export interface BossEntry {
  key: string;
  name: string;
  icon: string;
  tier: string;
  subject: string | null;
  encounters: number;
  kills: number;
  totalDamage: number;
  bestDamage: number;
  correctAnswers: number;
  mvpCount: number;
  firstBloods: number;
  lastHits: number;
  isTeacher: boolean;
}

function tierInfo(tier: string) {
  const t = (tier as BossTier) in BOSS_TIERS ? (tier as BossTier) : "common";
  return BOSS_TIERS[t];
}

export function BossCompendiumWrapper({ entries }: { entries: BossEntry[] }) {
  const [selected, setSelected] = useState<BossEntry | null>(null);
  const [search, setSearch] = useState("");
  const [onlyTeacher, setOnlyTeacher] = useState(false);

  const filtered = useMemo(() => {
    let list = entries;
    if (onlyTeacher) list = list.filter((e) => e.isTeacher);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q) || (e.subject ?? "").toLowerCase().includes(q));
    return list;
  }, [entries, search, onlyTeacher]);

  const totalKills = entries.reduce((s, e) => s + e.kills, 0);
  const totalDamage = entries.reduce((s, e) => s + e.totalDamage, 0);
  const totalMvp = entries.reduce((s, e) => s + e.mvpCount, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-fg">Deine Sammlung</p>
          <h1 className="text-2xl font-black">Boss-Kompendium</h1>
          <p className="mt-0.5 text-sm text-muted-fg">
            Bosse, die du besiegt hast — plus alle Lehrer-Herausforderungen.
          </p>
        </div>
        <Link
          href="/app/boss"
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-fg transition-all hover:brightness-105 active:scale-95"
        >
          <Swords className="size-4" /> Zum Kampf
        </Link>
      </div>

      {/* Summenkarten */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Bosse besiegt" value={totalKills} icon={<Skull className="size-4" />} />
        <StatTile label="Schaden gesamt" value={totalDamage.toLocaleString("de-DE")} icon={<Target className="size-4" />} />
        <StatTile label="MVP-Titel" value={totalMvp} icon={<Crown className="size-4" />} />
      </div>

      {/* Filter */}
      {entries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-fg" />
            <input
              type="text"
              placeholder="Boss oder Fach suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg py-2 pl-9 pr-3 text-sm outline-none focus:border-brand/60"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyTeacher((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
              onlyTeacher ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-fg hover:text-fg"
            )}
          >
            <GraduationCap className="size-3.5" /> Nur Lehrer-Bosse
          </button>
          <span className="ml-auto self-center text-xs text-muted-fg">{filtered.length} Bosse</span>
        </div>
      )}

      {/* Grid oder Empty-State */}
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface py-16 text-center">
          <p className="text-5xl">🐲</p>
          <p className="mt-3 font-bold">Noch kein Boss besiegt</p>
          <p className="mt-1 text-sm text-muted-fg">
            Zieh in den Kampf — besiegte Bosse und Lehrer-Herausforderungen erscheinen hier.
          </p>
          <Link href="/app/boss" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-fg hover:brightness-105">
            <Swords className="size-4" /> Boss angreifen
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-muted-fg">
          <p className="text-4xl">🔍</p>
          <p className="mt-2 font-semibold">Keine Bosse gefunden</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
          {filtered.map((e) => {
            const ti = tierInfo(e.tier);
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => setSelected(e)}
                className="group relative flex flex-col items-center gap-2 rounded-2xl border bg-surface p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: `${ti.color}55` }}
              >
                {/* ×N Badge — derselbe Boss mehrfach besiegt/getroffen */}
                {e.encounters > 1 && (
                  <span className="absolute right-2 top-2 rounded-full bg-fg/10 px-2 py-0.5 font-mono text-[11px] font-bold text-fg">
                    ×{e.encounters}
                  </span>
                )}
                {e.isTeacher && (
                  <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-brand/15 text-brand" title="Von einer Lehrkraft erstellt">
                    <GraduationCap className="size-3.5" />
                  </span>
                )}
                <span className="mt-2 text-4xl leading-none" style={{ filter: `drop-shadow(0 0 8px ${ti.color}55)` }}>{e.icon}</span>
                <span className="line-clamp-1 text-sm font-bold">{e.name}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: ti.color, backgroundColor: `${ti.color}18` }}>
                  {ti.label}
                </span>
                {e.subject && <span className="text-[11px] text-muted-fg">{e.subject}</span>}
                <div className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: ti.color }}>
                  <Target className="size-3" /> {e.totalDamage.toLocaleString("de-DE")} Schaden
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail-Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border bg-surface p-6"
            style={{ borderColor: `${tierInfo(selected.tier).color}66` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-3 top-3 text-xl leading-none text-muted-fg hover:text-fg"
              aria-label="Schließen"
              onClick={() => setSelected(null)}
            >
              ✕
            </button>

            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-6xl leading-none" style={{ filter: `drop-shadow(0 0 12px ${tierInfo(selected.tier).color}66)` }}>{selected.icon}</span>
              <h2 className="text-xl font-black">{selected.name}</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: tierInfo(selected.tier).color, backgroundColor: `${tierInfo(selected.tier).color}18` }}>
                  {tierInfo(selected.tier).label}
                </span>
                {selected.subject && <span className="text-xs text-muted-fg">{selected.subject}</span>}
              </div>
              {selected.isTeacher && (
                <span className="flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                  <GraduationCap className="size-3.5" /> Lehrer-Herausforderung
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <DetailStat label="Begegnungen" value={`×${selected.encounters}`} />
              <DetailStat label="Siege" value={selected.kills} accent="#22c55e" />
              <DetailStat label="Schaden gesamt" value={selected.totalDamage.toLocaleString("de-DE")} />
              <DetailStat label="Bester Kampf" value={`${selected.bestDamage} Schaden`} />
              <DetailStat label="Richtige Antworten" value={selected.correctAnswers} />
              <DetailStat label="MVP" value={selected.mvpCount} icon={<Crown className="size-3.5" />} accent="#eab308" />
              <DetailStat label="First Blood" value={selected.firstBloods} icon={<Droplets className="size-3.5" />} accent="#ef4444" />
              <DetailStat label="Last Hit" value={selected.lastHits} icon={<Skull className="size-3.5" />} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-fg">{icon}</div>
      <p className="mt-1 font-mono text-xl font-black">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-fg">{label}</p>
    </div>
  );
}

function DetailStat({ label, value, icon, accent }: { label: string; value: string | number; icon?: ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 font-mono text-base font-bold" style={accent ? { color: accent } : undefined}>
        {icon}{value}
      </div>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-fg">{label}</p>
    </div>
  );
}
