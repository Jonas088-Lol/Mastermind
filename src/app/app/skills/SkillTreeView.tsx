"use client";

import { useRef, useEffect, useState } from "react";
import {
  STATIC_TREES,
  getCurrentRank,
  getNextRank,
  rankUpXp,
  type SubjectKey,
  type StaticRank,
  type SubjectTree,
  SUBJECT_KEYS,
} from "@/lib/skill-tree-static";

interface SubjectProgress {
  subjectKey: string;
  totalMinutes: number;
}

interface Props {
  progress: SubjectProgress[];
}

// ── Layout constants ──────────────────────────────────────
const CANVAS = 2400;
const CENTER = CANVAS / 2;   // 1200
const HUB_R   = 52;
const NODE_R  = 30;
const FIRST_R = 190;         // center to rank-1 node
const SPACING = 82;          // between consecutive nodes
const LABEL_R = FIRST_R + 11 * SPACING + 70; // subject label radius

const ANGLES_DEG: Record<SubjectKey, number> = {
  mathematik: -90,
  deutsch:    -45,
  englisch:     0,
  physik:      45,
  chemie:      90,
  biologie:   135,
  geschichte: 180,
  informatik: -135,
};

function toXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + Math.cos(rad) * r, y: CENTER + Math.sin(rad) * r };
}

// ── Star background (generated once) ─────────────────────
const STARS = Array.from({ length: 200 }, (_, i) => ({
  x: (((i * 137.508 + 42) % CANVAS)),
  y: (((i * 97.3 + 17) % CANVAS)),
  r: i % 5 === 0 ? 1.5 : 0.8,
  o: 0.2 + (i % 10) * 0.06,
}));

export function SkillTreeView({ progress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<{ subjectKey: SubjectKey; rank: StaticRank } | null>(null);
  const progressMap = new Map(progress.map((p) => [p.subjectKey, p.totalMinutes]));

  // Center scroll on hub on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft = CENTER - el.clientWidth / 2;
    el.scrollTop  = CENTER - el.clientHeight / 2;
  }, []);

  const totalMinutesAll = [...progressMap.values()].reduce((a, b) => a + b, 0);
  const maxMinutes = SUBJECT_KEYS.length * 4800;
  const overallPct = Math.min(100, (totalMinutesAll / maxMinutes) * 100);
  const completedSubjects = SUBJECT_KEYS.filter((k) => (progressMap.get(k) ?? 0) >= 4800).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top stats bar */}
      <div className="shrink-0 px-4 py-2 flex items-center gap-4 bg-black/20 border-b border-white/5">
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${overallPct}%`,
                background: "linear-gradient(90deg, #6366f1, #f59e0b, #22c55e)",
              }}
            />
          </div>
        </div>
        <span className="text-[11px] text-white/40 shrink-0">
          {completedSubjects}/{SUBJECT_KEYS.length} gemeistert · {Math.round(totalMinutesAll / 60)}h
        </span>
      </div>

      {/* Scroll hint */}
      <p className="text-center text-[10px] text-white/20 py-1 shrink-0">
        Scrolle zum Erkunden · Tippe auf einen Rang-Knoten für Details
      </p>

      {/* Radial tree canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ background: "radial-gradient(ellipse at center, #0d0d2b 0%, #050510 70%)" }}
      >
        <svg
          width={CANVAS}
          height={CANVAS}
          style={{ display: "block" }}
        >
          <defs>
            {/* Glow filters per subject */}
            {SUBJECT_KEYS.map((key) => {
              const color = STATIC_TREES[key].color;
              return (
                <filter key={key} id={`glow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feFlood floodColor={color} floodOpacity="0.6" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              );
            })}
            <filter id="glow-hub" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.7" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Stars */}
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
          ))}

          {/* Subject arms */}
          {SUBJECT_KEYS.map((key) => (
            <SubjectArm
              key={key}
              subjectKey={key}
              totalMinutes={progressMap.get(key) ?? 0}
              onNodeClick={(rank) => setSelected({ subjectKey: key, rank })}
            />
          ))}

          {/* Center hub */}
          <circle cx={CENTER} cy={CENTER} r={HUB_R + 16} fill="#f59e0b" opacity={0.08} />
          <circle cx={CENTER} cy={CENTER} r={HUB_R + 8}  fill="#f59e0b" opacity={0.12} />
          <circle
            cx={CENTER} cy={CENTER} r={HUB_R}
            fill="#0a0a1a"
            stroke="#f59e0b"
            strokeWidth={2.5}
            filter="url(#glow-hub)"
          />
          <text
            x={CENTER} y={CENTER - 6}
            textAnchor="middle"
            fontSize={20}
            fill="#f59e0b"
            fontWeight="900"
          >
            ★
          </text>
          <text
            x={CENTER} y={CENTER + 14}
            textAnchor="middle"
            fontSize={10}
            fill="#f59e0b"
            opacity={0.7}
            fontWeight="bold"
            letterSpacing={1}
          >
            SKILLS
          </text>
        </svg>
      </div>

      {/* Detail panel (slides up when a node is selected) */}
      {selected && (
        <NodeDetailPanel
          subjectKey={selected.subjectKey}
          rank={selected.rank}
          totalMinutes={progressMap.get(selected.subjectKey) ?? 0}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Subject arm component ─────────────────────────────────

function SubjectArm({
  subjectKey,
  totalMinutes,
  onNodeClick,
}: {
  subjectKey: SubjectKey;
  totalMinutes: number;
  onNodeClick: (rank: StaticRank) => void;
}) {
  const tree = STATIC_TREES[subjectKey];
  const angleDeg = ANGLES_DEG[subjectKey];
  const currentRank = getCurrentRank(tree, totalMinutes);

  const nodePositions = tree.ranks.map((_, i) => toXY(angleDeg, FIRST_R + i * SPACING));
  const labelPos = toXY(angleDeg, LABEL_R);

  // Determine label text anchor based on angle
  const labelAnchor =
    angleDeg === 0 ? "start"
    : angleDeg === 180 ? "end"
    : "middle";

  const labelDX =
    angleDeg === 0 ? 8
    : angleDeg === 180 ? -8
    : 0;

  return (
    <g>
      {/* Connecting lines between consecutive nodes */}
      {tree.ranks.map((rank, i) => {
        if (i === 0) return null;
        const from = nodePositions[i - 1]!;
        const to   = nodePositions[i]!;
        const active = totalMinutes >= rank.minMinutes;
        return (
          <line
            key={`line-${i}`}
            x1={from.x} y1={from.y}
            x2={to.x}   y2={to.y}
            stroke={active ? tree.color : "#1e1e3a"}
            strokeWidth={active ? 2.5 : 1.5}
            opacity={active ? 0.7 : 1}
          />
        );
      })}

      {/* Line from center to first node */}
      <line
        x1={CENTER} y1={CENTER}
        x2={nodePositions[0]!.x} y2={nodePositions[0]!.y}
        stroke={tree.color}
        strokeWidth={1.5}
        opacity={0.25}
        strokeDasharray="4 6"
      />

      {/* Nodes */}
      {tree.ranks.map((rank, i) => {
        const pos = nodePositions[i]!;
        const unlocked = totalMinutes >= rank.minMinutes;
        const isCurrent = rank.rank === currentRank.rank && totalMinutes < 4800;
        const isMastered = totalMinutes >= 4800 && rank.rank === 12;

        return (
          <g
            key={rank.rank}
            onClick={() => onNodeClick(rank)}
            style={{ cursor: "pointer" }}
          >
            {/* Outer glow ring for unlocked */}
            {(unlocked || isMastered) && (
              <circle
                cx={pos.x} cy={pos.y}
                r={NODE_R + 10}
                fill={tree.color}
                opacity={isCurrent ? 0.18 : 0.07}
              />
            )}
            {/* Pulse ring for current rank */}
            {isCurrent && (
              <circle
                cx={pos.x} cy={pos.y}
                r={NODE_R + 16}
                fill="none"
                stroke={tree.color}
                strokeWidth={1.5}
                opacity={0.3}
              />
            )}

            {/* Main node circle */}
            <circle
              cx={pos.x} cy={pos.y}
              r={NODE_R}
              fill={unlocked ? `${tree.color}28` : "#0d0d22"}
              stroke={unlocked ? tree.color : "#2a2a4a"}
              strokeWidth={isCurrent ? 2.5 : 1.5}
              filter={unlocked ? `url(#glow-${subjectKey})` : undefined}
            />

            {/* Rank icon */}
            <text
              x={pos.x} y={pos.y + 7}
              textAnchor="middle"
              fontSize={isMastered ? 20 : 14}
              fill={unlocked ? "white" : "#3a3a5a"}
              opacity={unlocked ? 1 : 0.5}
            >
              {rank.icon}
            </text>

            {/* Rank number on locked nodes */}
            {!unlocked && (
              <text
                x={pos.x} y={pos.y + 7}
                textAnchor="middle"
                fontSize={11}
                fill="#3a3a5a"
              >
                {rank.rank}
              </text>
            )}
          </g>
        );
      })}

      {/* Subject label */}
      <text
        x={labelPos.x + labelDX}
        y={labelPos.y}
        textAnchor={labelAnchor}
        dominantBaseline="middle"
        fontSize={13}
        fontWeight="bold"
        fill={tree.color}
        letterSpacing={1}
        style={{ textTransform: "uppercase" }}
      >
        {tree.label}
      </text>
      <text
        x={labelPos.x + labelDX}
        y={labelPos.y + 16}
        textAnchor={labelAnchor}
        dominantBaseline="middle"
        fontSize={10}
        fill={tree.color}
        opacity={0.5}
      >
        {tree.icon} · Rang {currentRank.rank}/12
      </text>
    </g>
  );
}

// ── Node detail panel ─────────────────────────────────────

function NodeDetailPanel({
  subjectKey,
  rank,
  totalMinutes,
  onClose,
}: {
  subjectKey: SubjectKey;
  rank: StaticRank;
  totalMinutes: number;
  onClose: () => void;
}) {
  const tree = STATIC_TREES[subjectKey];
  const unlocked = totalMinutes >= rank.minMinutes;
  const isCurrent = getCurrentRank(tree, totalMinutes).rank === rank.rank;
  const nextRank = getNextRank(tree, totalMinutes);
  const xpReward = rankUpXp(rank.rank);

  const minH = Math.floor(rank.minMinutes / 60);
  const minM = rank.minMinutes % 60;
  const threshold =
    minH > 0 ? `${minH}h${minM > 0 ? ` ${minM}min` : ""}` : `${minM}min`;

  return (
    <div
      className="shrink-0 border-t border-white/10 p-4 flex gap-4 items-start"
      style={{ background: `${tree.color}10` }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: `${tree.color}20`, border: `1px solid ${tree.color}40` }}
      >
        {unlocked ? rank.icon : "🔒"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: tree.color }}>
            {tree.label} · Rang {rank.rank}
          </p>
          {unlocked && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: `${tree.color}25`, color: tree.color }}
            >
              {isCurrent ? "Aktuell" : "Freigeschaltet"}
            </span>
          )}
        </div>
        <p className="text-base font-black text-white leading-tight mt-0.5">{rank.title}</p>
        <div className="flex gap-4 mt-1.5 text-[11px] text-white/40">
          <span>Ab {threshold} Lernzeit</span>
          {xpReward > 0 && (
            <span style={{ color: "#f59e0b" }}>+{xpReward.toLocaleString("de-DE")} XP beim Erreichen</span>
          )}
        </div>
        {!unlocked && nextRank && (
          <p className="text-[11px] text-white/30 mt-1">
            Noch {Math.ceil(rank.minMinutes - totalMinutes)} min Lernzeit nötig
          </p>
        )}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="text-white/30 hover:text-white/70 text-lg leading-none shrink-0 mt-0.5"
      >
        ×
      </button>
    </div>
  );
}
