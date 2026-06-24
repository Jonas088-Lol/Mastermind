"use client";

import { STATIC_TREES, getCurrentRank, getNextRank, type SubjectTree } from "@/lib/skill-tree-static";

interface SubjectProgress {
  subjectKey: string;
  totalMinutes: number;
}

interface Props {
  progress: SubjectProgress[];
}

const TOTAL_MINUTES = 4800; // 80h

export function SkillTreeView({ progress }: Props) {
  const progressMap = new Map(progress.map((p) => [p.subjectKey, p.totalMinutes]));

  const subjects = Object.values(STATIC_TREES);
  const totalMinutesAllSubjects = [...progressMap.values()].reduce((a, b) => a + b, 0);
  const maxTotalMinutes = subjects.length * TOTAL_MINUTES;
  const overallPct = Math.min(100, (totalMinutesAllSubjects / maxTotalMinutes) * 100);

  const completedSubjects = subjects.filter((s) => {
    const mins = progressMap.get(s.key) ?? 0;
    return mins >= TOTAL_MINUTES;
  }).length;

  return (
    <div className="flex flex-col gap-6 px-4 py-4 overflow-y-auto h-full">
      {/* Overall progress */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white/40">Gesamtfortschritt</span>
          <span className="text-xs text-white/60">
            {completedSubjects}/{subjects.length} Fächer gemeistert
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallPct}%`,
              background: "linear-gradient(90deg, #6366f1, #f59e0b, #22c55e)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-white/30">
            {Math.round(totalMinutesAllSubjects / 60)}h gelernt
          </span>
          <span className="text-[10px] text-white/30">
            {Math.round(maxTotalMinutes / 60)}h gesamt
          </span>
        </div>
      </div>

      {/* Per-subject cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {subjects.map((tree) => (
          <SubjectCard
            key={tree.key}
            tree={tree}
            totalMinutes={progressMap.get(tree.key) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

function SubjectCard({ tree, totalMinutes }: { tree: SubjectTree; totalMinutes: number }) {
  const currentRank = getCurrentRank(tree, totalMinutes);
  const nextRank = getNextRank(tree, totalMinutes);
  const isComplete = totalMinutes >= TOTAL_MINUTES;

  const progressInCurrentRank = nextRank
    ? totalMinutes - currentRank.minMinutes
    : TOTAL_MINUTES - currentRank.minMinutes;
  const rangeInCurrentRank = nextRank
    ? nextRank.minMinutes - currentRank.minMinutes
    : TOTAL_MINUTES - currentRank.minMinutes;
  const pct = rangeInCurrentRank > 0 ? Math.min(100, (progressInCurrentRank / rangeInCurrentRank) * 100) : 100;

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = Math.round(totalMinutes % 60);

  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3 transition-all"
      style={{
        background: `${tree.color}10`,
        borderColor: `${tree.color}30`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
          style={{ background: `${tree.color}20`, color: tree.color }}
        >
          {tree.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: tree.color }}>
            {tree.label}
          </p>
          <p className="text-sm font-black text-white leading-tight truncate">
            {currentRank.icon} {currentRank.title}
          </p>
        </div>
        {isComplete && (
          <div
            className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: `${tree.color}30`, color: tree.color }}
          >
            Gemeistert
          </div>
        )}
      </div>

      {/* Rank progress bar */}
      {!isComplete && nextRank && (
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] text-white/40">Rang {currentRank.rank}/12</span>
            <span className="text-[10px] text-white/40">
              Nächster: {nextRank.title}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: tree.color }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-white/30">
              {Math.round(progressInCurrentRank)} min
            </span>
            <span className="text-[10px] text-white/30">
              {rangeInCurrentRank} min
            </span>
          </div>
        </div>
      )}

      {/* Time stats */}
      <div className="flex items-center justify-between text-[11px] text-white/40">
        <span>
          {totalHours > 0 ? `${totalHours}h ` : ""}{totalMins}min gelernt
        </span>
        <span>Ziel: 80h</span>
      </div>

      {/* Rank timeline — compact dots */}
      <div className="flex items-center gap-1">
        {tree.ranks.map((r) => {
          const unlocked = totalMinutes >= r.minMinutes;
          const isCurrent = r.rank === currentRank.rank && !isComplete;
          return (
            <div
              key={r.rank}
              title={`Rang ${r.rank}: ${r.title} (${r.minMinutes} min)`}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{
                background: unlocked
                  ? isCurrent
                    ? tree.color
                    : `${tree.color}cc`
                  : "rgba(255,255,255,0.08)",
                boxShadow: isCurrent ? `0 0 6px ${tree.color}` : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-white/20">
        <span>Rang 1</span>
        <span>Rang 12</span>
      </div>
    </div>
  );
}
