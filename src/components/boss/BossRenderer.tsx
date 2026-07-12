/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

/**
 * BossRenderer.tsx — Procedural SVG boss renderer
 *
 * Every boss gets a unique, visually distinct appearance from:
 *   1. A seeded pseudo-random body shape (derived from boss ID)
 *   2. Subject color palette
 *   3. Rarity frame + glow tier
 *   4. Emoji face overlay
 *   5. Animated aura (rarity-dependent)
 *
 * Legendary/Mythic/Secret bosses with custom=true get their own
 * bespoke sub-components (BossCustom_*) imported conditionally.
 *
 * Usage:
 *   <BossRenderer bossId="zahlenschatten" size={200} animated />
 */

import { useMemo } from "react";
import type { BossDef, BossRarity } from "@/lib/boss-defs";
import { RARITY_COLOR, SUBJECT_COLOR } from "@/lib/boss-defs";

// ── Bespoke components for headliner bosses ───────────────────────────────────
// Import lazily via React.lazy in production; here direct imports for simplicity.
// Each exports default: (props: { size: number; animated: boolean }) => JSX.Element
import { BossCustom_Xerath }           from "./bespoke/BossCustom_Xerath";
import { BossCustom_Kalkulon }         from "./bespoke/BossCustom_Kalkulon";
import { BossCustom_Mastermind }       from "./bespoke/BossCustom_Mastermind";
import { BossCustom_OmegaPrime }       from "./bespoke/BossCustom_OmegaPrime";
import { BossCustom_SchwarzeProphet }  from "./bespoke/BossCustom_SchwarzeProphet";
import { BossCustom_SchroedingersHerrscher } from "./bespoke/BossCustom_SchroedingersHerrscher";

const BESPOKE_MAP: Record<string, React.ComponentType<{ size: number; animated: boolean }>> = {
  "xerath":                      BossCustom_Xerath,
  "kalkulon":                    BossCustom_Kalkulon,
  "mastermind":                  BossCustom_Mastermind,
  "omega-prime":                 BossCustom_OmegaPrime,
  "schwarzer-prophet":           BossCustom_SchwarzeProphet,
  "schroedingers-herrscher":     BossCustom_SchroedingersHerrscher,
};

// ── Seeded deterministic RNG ──────────────────────────────────────────────────
function seededRand(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return function () {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return ((h >>> 0) / 0x100000000);
  };
}

// ── Generate organic body polygon ─────────────────────────────────────────────
function bodyPolygon(id: string, cx: number, cy: number, r: number, points: number): string {
  const rand = seededRand(id + "_body");
  const pts: string[] = [];
  for (let i = 0; i < points; i++) {
    const angle   = (i / points) * Math.PI * 2 - Math.PI / 2;
    const jitter  = 0.65 + rand() * 0.7;
    const x = cx + Math.cos(angle) * r * jitter;
    const y = cy + Math.sin(angle) * r * jitter;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

// ── Rarity visual config ──────────────────────────────────────────────────────
interface RarityConfig {
  frameStroke:  number;
  glowBlur:     number;
  glowOpacity:  number;
  bodyPoints:   number;
  particleCount:number;
  animSpeed:    number;   // seconds for rotation
  auraScale:    number;   // aura vs body size ratio
}

const RARITY_CONFIG: Record<BossRarity, RarityConfig> = {
  COMMON:    { frameStroke: 2, glowBlur: 4,  glowOpacity: 0.3, bodyPoints: 8,  particleCount: 0,  animSpeed: 0,   auraScale: 1.0 },
  UNCOMMON:  { frameStroke: 2, glowBlur: 6,  glowOpacity: 0.5, bodyPoints: 10, particleCount: 3,  animSpeed: 8,   auraScale: 1.1 },
  RARE:      { frameStroke: 3, glowBlur: 10, glowOpacity: 0.6, bodyPoints: 10, particleCount: 5,  animSpeed: 6,   auraScale: 1.15},
  EPIC:      { frameStroke: 3, glowBlur: 14, glowOpacity: 0.7, bodyPoints: 12, particleCount: 8,  animSpeed: 5,   auraScale: 1.2 },
  LEGENDARY: { frameStroke: 4, glowBlur: 20, glowOpacity: 0.8, bodyPoints: 14, particleCount: 12, animSpeed: 4,   auraScale: 1.3 },
  MYTHIC:    { frameStroke: 4, glowBlur: 28, glowOpacity: 0.9, bodyPoints: 16, particleCount: 18, animSpeed: 3,   auraScale: 1.4 },
  SECRET:    { frameStroke: 5, glowBlur: 36, glowOpacity: 1.0, bodyPoints: 18, particleCount: 24, animSpeed: 2.5, auraScale: 1.5 },
};

// ── Sub-shapes seeded per boss ────────────────────────────────────────────────
function orbits(id: string, rarity: BossRarity, cx: number, cy: number, r: number, color: string) {
  const rand  = seededRand(id + "_orbits");
  const count = Math.floor(rand() * 2) + (rarity === "COMMON" ? 0 : 1);
  const els   = [];
  for (let i = 0; i < count; i++) {
    const or  = r * (0.9 + rand() * 0.4);
    const ox  = cx + (rand() - 0.5) * r * 0.3;
    const oy  = cy + (rand() - 0.5) * r * 0.3;
    const dur = 3 + rand() * 4;
    els.push(
      <circle key={`orb-${i}`} cx={ox} cy={oy} r={or} fill="none"
        stroke={color} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="4 8">
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={`${dur}s`} repeatCount="indefinite" />
      </circle>
    );
  }
  return els;
}

// ── Eyes ──────────────────────────────────────────────────────────────────────
function eyes(id: string, rarity: BossRarity, cx: number, cy: number, r: number, color: string) {
  const rand = seededRand(id + "_eyes");
  const eyeR = r * 0.08 + rand() * r * 0.04;
  const eyeSep = r * 0.22;
  const eyeY   = cy - r * 0.12;

  const pupilR = eyeR * 0.45;
  const glow = rarity === "LEGENDARY" || rarity === "MYTHIC" || rarity === "SECRET";

  return (
    <g>
      {glow && <circle cx={cx - eyeSep} cy={eyeY} r={eyeR * 1.8} fill={color} fillOpacity={0.2}>
        <animate attributeName="r" values={`${eyeR * 1.5};${eyeR * 2.2};${eyeR * 1.5}`} dur="2s" repeatCount="indefinite" />
      </circle>}
      {glow && <circle cx={cx + eyeSep} cy={eyeY} r={eyeR * 1.8} fill={color} fillOpacity={0.2}>
        <animate attributeName="r" values={`${eyeR * 1.5};${eyeR * 2.2};${eyeR * 1.5}`} dur="2s" repeatCount="indefinite" />
      </circle>}
      <circle cx={cx - eyeSep} cy={eyeY} r={eyeR} fill="#0a0a14" />
      <circle cx={cx + eyeSep} cy={eyeY} r={eyeR} fill="#0a0a14" />
      <circle cx={cx - eyeSep} cy={eyeY} r={pupilR} fill={color} />
      <circle cx={cx + eyeSep} cy={eyeY} r={pupilR} fill={color} />
    </g>
  );
}

// ── Particles ─────────────────────────────────────────────────────────────────
function particles(id: string, count: number, cx: number, cy: number, r: number, color: string, animated: boolean) {
  if (count === 0 || !animated) return null;
  const rand = seededRand(id + "_particles");
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const angle  = (i / count) * Math.PI * 2;
        const dist   = r * (1.1 + rand() * 0.5);
        const px     = cx + Math.cos(angle) * dist;
        const py     = cy + Math.sin(angle) * dist;
        const pr     = 1 + rand() * 2.5;
        const dur    = 1.5 + rand() * 2;
        const delay  = rand() * -dur;
        return (
          <circle key={`p-${i}`} cx={px} cy={py} r={pr} fill={color} fillOpacity={0.7}>
            <animate attributeName="opacity" values="0.7;0;0.7" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
            <animate attributeName="r" values={`${pr};${pr * 0.3};${pr}`} dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </g>
  );
}

// ── Secret rainbow aura ───────────────────────────────────────────────────────
function secretAura(cx: number, cy: number, r: number, animated: boolean) {
  const stops = ["#f59e0b", "#ef4444", "#a855f7", "#3b82f6", "#22c55e", "#f59e0b"];
  return (
    <g>
      <defs>
        <radialGradient id="secret-aura" cx="50%" cy="50%">
          {stops.map((c, i) => (
            <stop key={i} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={c} stopOpacity={i === stops.length - 1 ? 0 : 0.25} />
          ))}
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.6} fill="url(#secret-aura)">
        {animated && <animate attributeName="r" values={`${r * 1.4};${r * 1.7};${r * 1.4}`} dur="3s" repeatCount="indefinite" />}
      </circle>
    </g>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────
interface BossRendererProps {
  boss:     BossDef;
  size?:    number;
  animated?:boolean;
  hp?:      number;   // current HP (0 = dead)
  maxHp?:   number;
  phase?:   number;   // current phase (1..N), tints aura
  className?:string;
}

export function BossRenderer({
  boss, size = 200, animated = true, hp, maxHp, phase = 1, className,
}: BossRendererProps) {
  // Check for bespoke component
  const BespokeComp = boss.custom ? BESPOKE_MAP[boss.id] : undefined;
  if (BespokeComp) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        <BespokeComp size={size} animated={animated} />
      </div>
    );
  }

  const cfg      = RARITY_CONFIG[boss.rarity];
  const color    = SUBJECT_COLOR[boss.subject] ?? "#8b5cf6";
  const rarColor = RARITY_COLOR[boss.rarity];
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.32;

  // Emoji font size scales with size
  const emojiFontSize = size * 0.28;

  // Body polygon
  const bodyPts = useMemo(
    () => bodyPolygon(boss.id, cx, cy, r, cfg.bodyPoints),
    [boss.id, cx, cy, r, cfg.bodyPoints],
  );

  // HP damage tint (dark red when low HP)
  const hpRatio  = (hp != null && maxHp) ? hp / maxHp : 1;
  const damageTint = hpRatio < 0.3 ? 0.5 : hpRatio < 0.6 ? 0.25 : 0;

  const glowId = `glow-${boss.id}`;
  const auraId = `aura-${boss.id}`;

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label={`Boss: ${boss.name}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={cfg.glowBlur} result="blur" />
          <feComposite in="blur" in2="SourceGraphic" operator="over" />
        </filter>
        <radialGradient id={auraId} cx="50%" cy="50%">
          <stop offset="0%"   stopColor={color}    stopOpacity={cfg.glowOpacity * 0.4} />
          <stop offset="60%"  stopColor={color}    stopOpacity={cfg.glowOpacity * 0.15}/>
          <stop offset="100%" stopColor={rarColor} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Secret rainbow aura */}
      {boss.rarity === "SECRET" && secretAura(cx, cy, r, animated)}

      {/* Main aura circle */}
      {boss.rarity !== "COMMON" && (
        <circle cx={cx} cy={cy} r={r * cfg.auraScale} fill={`url(#${auraId})`}>
          {animated && cfg.animSpeed > 0 && (
            <animate attributeName="r"
              values={`${r * cfg.auraScale * 0.92};${r * cfg.auraScale * 1.08};${r * cfg.auraScale * 0.92}`}
              dur={`${cfg.animSpeed * 0.5}s`} repeatCount="indefinite" />
          )}
        </circle>
      )}

      {/* Orbit rings */}
      {boss.rarity !== "COMMON" && orbits(boss.id, boss.rarity, cx, cy, r, color)}

      {/* Body */}
      <polygon
        points={bodyPts}
        fill={`${color}22`}
        stroke={color}
        strokeWidth={cfg.frameStroke}
        strokeOpacity={0.85}
        filter={`url(#${glowId})`}
      />

      {/* Rarity overlay glow on body */}
      <polygon
        points={bodyPts}
        fill={rarColor}
        fillOpacity={0.06}
        stroke={rarColor}
        strokeWidth={1}
        strokeOpacity={0.4}
      />

      {/* Damage tint */}
      {damageTint > 0 && (
        <polygon points={bodyPts} fill="#ef4444" fillOpacity={damageTint} />
      )}

      {/* Eyes */}
      {eyes(boss.id, boss.rarity, cx, cy, r, color)}

      {/* Emoji face */}
      <text
        x={cx}
        y={cy + r * 0.22}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={emojiFontSize}
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {boss.emoji}
      </text>

      {/* Particles */}
      {particles(boss.id, cfg.particleCount, cx, cy, r, rarColor, animated)}

      {/* Rarity frame (corner triangles) */}
      {boss.rarity !== "COMMON" && (
        <g stroke={rarColor} strokeWidth={1.5} strokeOpacity={0.6} fill="none">
          <polyline points={`${cx - r * 0.9},${cy - r * 1.1} ${cx - r * 0.9},${cy - r * 0.7} ${cx - r * 0.5},${cy - r * 1.1}`} />
          <polyline points={`${cx + r * 0.9},${cy - r * 1.1} ${cx + r * 0.9},${cy - r * 0.7} ${cx + r * 0.5},${cy - r * 1.1}`} />
          <polyline points={`${cx - r * 0.9},${cy + r * 1.1} ${cx - r * 0.9},${cy + r * 0.7} ${cx - r * 0.5},${cy + r * 1.1}`} />
          <polyline points={`${cx + r * 0.9},${cy + r * 1.1} ${cx + r * 0.9},${cy + r * 0.7} ${cx + r * 0.5},${cy + r * 1.1}`} />
        </g>
      )}

      {/* Phase indicator dots */}
      {phase > 1 && (
        <g>
          {Array.from({ length: phase }, (_, i) => (
            <circle
              key={i}
              cx={cx - ((phase - 1) * 5) + i * 10}
              cy={cy + r * 1.3}
              r={3}
              fill={rarColor}
              fillOpacity={0.9}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
