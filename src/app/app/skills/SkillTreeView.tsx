"use client";

import { useRef, useEffect, useState, useCallback, useTransition } from "react";
import {
  SKILL_NODES,
  SKILL_NODE_MAP,
  SUBJECT_LABEL_POSITIONS,
  CANVAS_SIZE,
  CANVAS_CTR,
  getNodeState,
  type SkillNode,
} from "@/lib/skill-tree-nodes";
import { unlockSkillNode } from "./actions";

// ── Constants ─────────────────────────────────────────────
const NODE_R      = 28;   // circle radius
const HUB_R       = 48;
const STAR_COUNT  = 220;

// Precompute stars once (stable positions)
const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  x: ((i * 137.508 + i * 43) % CANVAS_SIZE + CANVAS_SIZE) % CANVAS_SIZE,
  y: ((i * 97.31  + i * 17) % CANVAS_SIZE + CANVAS_SIZE) % CANVAS_SIZE,
  r: i % 7 === 0 ? 1.6 : i % 3 === 0 ? 1.1 : 0.7,
  o: 0.15 + (i % 12) * 0.05,
}));

// ── Props ─────────────────────────────────────────────────
interface Props {
  unlockedKeys: string[];
  userXp:       number;
  displayName:  string;
}

// ── Component ─────────────────────────────────────────────
export function SkillTreeView({ unlockedKeys, userXp, displayName }: Props) {
  // Local state for optimistic updates
  const [localUnlocked, setLocalUnlocked] = useState<Set<string>>(
    () => new Set(unlockedKeys)
  );
  const [localXp, setLocalXp] = useState(userXp);
  const [selected, setSelected]   = useState<SkillNode | null>(null);
  const [errorMsg, setErrorMsg]    = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Pan state (no re-renders during drag) ────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const txRef        = useRef({ x: 0, y: 0 });          // current translate
  const dragRef      = useRef<{ sx: number; sy: number; stx: number; sty: number } | null>(null);
  const didDrag      = useRef(false);

  // Center the hub on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const x = el.clientWidth  / 2 - CANVAS_CTR;
    const y = el.clientHeight / 2 - CANVAS_CTR;
    txRef.current = { x, y };
    if (svgRef.current) svgRef.current.style.transform = `translate(${x}px,${y}px)`;
  }, []);

  // ── Drag: mouse ───────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, stx: txRef.current.x, sty: txRef.current.y };
    didDrag.current = false;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag.current = true;
    const nx = dragRef.current.stx + dx;
    const ny = dragRef.current.sty + dy;
    txRef.current = { x: nx, y: ny };
    if (svgRef.current) svgRef.current.style.transform = `translate(${nx}px,${ny}px)`;
  }, []);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  // ── Drag: touch ───────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]!;
    dragRef.current = { sx: t.clientX, sy: t.clientY, stx: txRef.current.x, sty: txRef.current.y };
    didDrag.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const t = e.touches[0]!;
    const dx = t.clientX - dragRef.current.sx;
    const dy = t.clientY - dragRef.current.sy;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) didDrag.current = true;
    const nx = dragRef.current.stx + dx;
    const ny = dragRef.current.sty + dy;
    txRef.current = { x: nx, y: ny };
    if (svgRef.current) svgRef.current.style.transform = `translate(${nx}px,${ny}px)`;
  }, []);

  const onTouchEnd = useCallback(() => { dragRef.current = null; }, []);

  // ── Node click ────────────────────────────────────────────
  const onNodeClick = useCallback((node: SkillNode) => {
    if (didDrag.current) return;
    setErrorMsg(null);
    setSelected((prev) => prev?.key === node.key ? null : node);
  }, []);

  // ── Unlock action ─────────────────────────────────────────
  const handleUnlock = useCallback(() => {
    if (!selected) return;
    const cost = selected.xpCost;
    if (localXp < cost) {
      setErrorMsg(`Nicht genug XP — du brauchst ${cost.toLocaleString("de-DE")} XP`);
      return;
    }
    // Optimistic update
    const key = selected.key;
    setLocalUnlocked((prev) => new Set([...prev, key]));
    setLocalXp((prev) => prev - cost);
    setSelected(null);
    setErrorMsg(null);

    startTransition(async () => {
      const res = await unlockSkillNode(key);
      if (!res.ok) {
        // Revert
        setLocalUnlocked((prev) => { const s = new Set(prev); s.delete(key); return s; });
        setLocalXp((prev) => prev + cost);
        setErrorMsg(res.error ?? "Fehler beim Freischalten");
      } else if (res.newXp !== undefined) {
        setLocalXp(res.newXp);
      }
    });
  }, [selected, localXp]);

  // ── Compute visible nodes / edges ─────────────────────────
  const visibleNodes = SKILL_NODES.filter((n) => {
    if (n.isHub) return true;
    const state = getNodeState(n.key, localUnlocked);
    return state !== "hidden";
  });

  // Edges: draw between nodes where both are at least revealed
  const visibleEdges: Array<{ from: SkillNode; to: SkillNode; active: boolean }> = [];
  for (const node of SKILL_NODES) {
    if (node.isHub) continue;
    const toState = getNodeState(node.key, localUnlocked);
    if (toState === "hidden") continue;
    for (const reqKey of node.requires) {
      const fromNode = SKILL_NODE_MAP.get(reqKey);
      if (!fromNode) continue;
      const fromState = getNodeState(fromNode.key, localUnlocked);
      if (fromState === "hidden") continue;
      visibleEdges.push({
        from:   fromNode,
        to:     node,
        active: localUnlocked.has(node.key) || node.isHub,
      });
    }
  }

  // Stats
  const totalNodes    = SKILL_NODES.length - 1; // exclude hub
  const unlockedCount = localUnlocked.size;

  // ── Subject label text anchor ──────────────────────────────
  function labelAnchor(angle: number) {
    if (angle === 0)   return "start";
    if (angle === 180 || angle === -180) return "end";
    return "middle";
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#05050f" }}>
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-black/30">
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Skill-Baum</p>
          <p className="text-sm font-black text-white leading-tight">{displayName}s Baum</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] text-white/30">Freigeschaltet</p>
            <p className="text-xs font-black text-white">
              {unlockedCount}<span className="text-white/30 font-normal">/{totalNodes}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/30">XP</p>
            <p className="text-xs font-black text-indigo-400">{localXp.toLocaleString("de-DE")}</p>
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="text-center text-[10px] text-white/20 py-1 shrink-0 select-none">
        Ziehen zum Navigieren · Tippen zum Freischalten
      </p>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <svg
          ref={svgRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{
            position: "absolute",
            top: 0, left: 0,
            userSelect: "none",
            willChange: "transform",
          }}
        >
          <defs>
            <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#0d0d2e" />
              <stop offset="100%" stopColor="#050510" />
            </radialGradient>

            {/* Per-subject glow filters */}
            {SUBJECT_LABEL_POSITIONS.map(({ key, color }) => (
              <filter key={key} id={`glow-${key}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feFlood floodColor={color} floodOpacity="0.55" result="c" />
                <feComposite in="c" in2="blur" operator="in" result="g" />
                <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
            <filter id="glow-hub" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.7" result="c" />
              <feComposite in="c" in2="blur" operator="in" result="g" />
              <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-feature" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.9" result="c" />
              <feComposite in="c" in2="blur" operator="in" result="g" />
              <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-select" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor="#ffffff" floodOpacity="0.8" result="c" />
              <feComposite in="c" in2="blur" operator="in" result="g" />
              <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={CANVAS_SIZE} height={CANVAS_SIZE} fill="url(#bg-grad)" />
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
          ))}

          {/* Edges */}
          {visibleEdges.map((e, i) => (
            <line
              key={i}
              x1={e.from.x} y1={e.from.y}
              x2={e.to.x}   y2={e.to.y}
              stroke={e.active ? e.to.color : "#1e1e3c"}
              strokeWidth={e.active ? 2.5 : 1.5}
              opacity={e.active ? 0.6 : 0.4}
              strokeDasharray={e.active ? undefined : "5 7"}
            />
          ))}

          {/* Subject labels */}
          {SUBJECT_LABEL_POSITIONS.map(({ key, label, color, x, y, angle }) => {
            const hasAny = localUnlocked.has(`${key}_c1`);
            return (
              <g key={key} opacity={hasAny ? 1 : 0.35}>
                <text
                  x={x} y={y - 8}
                  textAnchor={labelAnchor(angle)}
                  dominantBaseline="middle"
                  fontSize={13}
                  fontWeight="bold"
                  fill={color}
                  letterSpacing={1.5}
                  style={{ textTransform: "uppercase", fontFamily: "system-ui" }}
                >
                  {label}
                </text>
                <text
                  x={x} y={y + 10}
                  textAnchor={labelAnchor(angle)}
                  dominantBaseline="middle"
                  fontSize={9}
                  fill={color}
                  opacity={0.5}
                  letterSpacing={0.5}
                >
                  {localUnlocked.has(`${key}_a5`) && localUnlocked.has(`${key}_b5`)
                    ? "★ GEMEISTERT"
                    : `${[...localUnlocked].filter(k => k.startsWith(key + "_")).length}/14 Knoten`
                  }
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {visibleNodes.map((node) => {
            if (node.isHub) return <HubNode key={node.key} node={node} onClick={() => onNodeClick(node)} />;
            const state     = getNodeState(node.key, localUnlocked);
            const isSelected = selected?.key === node.key;
            if (state === "hidden") return null;
            if (node.nodeType === "feature") {
              return (
                <FeatureNode
                  key={node.key}
                  node={node}
                  state={state}
                  isSelected={isSelected}
                  canAfford={localXp >= node.xpCost}
                  onClick={() => onNodeClick(node)}
                />
              );
            }
            return (
              <TreeNode
                key={node.key}
                node={node}
                state={state}
                isSelected={isSelected}
                canAfford={localXp >= node.xpCost}
                onClick={() => onNodeClick(node)}
              />
            );
          })}
        </svg>
      </div>

      {/* Error toast */}
      {errorMsg && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50">
          {errorMsg}
        </div>
      )}

      {/* Detail / unlock panel */}
      {selected && (
        <UnlockPanel
          node={selected}
          state={(getNodeState(selected.key, localUnlocked) as "revealed" | "unlocked")}
          canAfford={localXp >= selected.xpCost}
          userXp={localXp}
          isPending={isPending}
          onUnlock={handleUnlock}
          onClose={() => { setSelected(null); setErrorMsg(null); }}
        />
      )}
    </div>
  );
}

// ── Hub node ───────────────────────────────────────────────
function HubNode({ node, onClick }: { node: SkillNode; onClick: () => void }) {
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <circle cx={node.x} cy={node.y} r={HUB_R + 22} fill="#f59e0b" opacity={0.06} />
      <circle cx={node.x} cy={node.y} r={HUB_R + 12} fill="#f59e0b" opacity={0.10} />
      <circle
        cx={node.x} cy={node.y} r={HUB_R}
        fill="#0a0a1f" stroke="#f59e0b" strokeWidth={2.5}
        filter="url(#glow-hub)"
      />
      <text x={node.x} y={node.y - 6}  textAnchor="middle" fontSize={22} fill="#f59e0b">★</text>
      <text x={node.x} y={node.y + 12} textAnchor="middle" fontSize={9}
        fill="#f59e0b" opacity={0.7} fontWeight="bold" letterSpacing={1}>SKILLS</text>
    </g>
  );
}

// ── Subject tree node ──────────────────────────────────────
function TreeNode({
  node, state, isSelected, canAfford, onClick,
}: {
  node: SkillNode;
  state: "revealed" | "unlocked";
  isSelected: boolean;
  canAfford: boolean;
  onClick: () => void;
}) {
  const unlocked  = state === "unlocked";
  const glowId    = `glow-${node.subjectKey}`;

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {/* Outer glow ring */}
      {unlocked && (
        <>
          <circle cx={node.x} cy={node.y} r={NODE_R + 14} fill={node.color} opacity={0.08} />
          <circle cx={node.x} cy={node.y} r={NODE_R + 7}  fill={node.color} opacity={0.12} />
        </>
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle cx={node.x} cy={node.y} r={NODE_R + 18}
          fill="none" stroke="white" strokeWidth={1.5} opacity={0.5} />
      )}

      {/* Affordability pulse ring (revealed + can afford) */}
      {!unlocked && canAfford && (
        <circle cx={node.x} cy={node.y} r={NODE_R + 10}
          fill={node.color} opacity={0.15} />
      )}

      {/* Main circle */}
      <circle
        cx={node.x} cy={node.y} r={NODE_R}
        fill={unlocked ? `${node.color}30` : "#0b0b22"}
        stroke={unlocked ? node.color : canAfford ? `${node.color}80` : "#232340"}
        strokeWidth={isSelected ? 2.5 : unlocked ? 2 : 1.5}
        filter={unlocked ? `url(#${glowId})` : isSelected ? "url(#glow-select)" : undefined}
      />

      {/* Icon / content */}
      {unlocked ? (
        <text x={node.x} y={node.y + 7} textAnchor="middle" fontSize={16} fill="white">
          {node.icon}
        </text>
      ) : (
        <>
          <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={12}
            fill={canAfford ? node.color : "#353560"} opacity={canAfford ? 0.9 : 1}>
            {canAfford ? node.icon : "🔒"}
          </text>
          {/* Cost label below locked nodes */}
          <text x={node.x} y={node.y + NODE_R + 13} textAnchor="middle" fontSize={9}
            fill={canAfford ? node.color : "#353560"} opacity={canAfford ? 0.85 : 0.5}>
            {(node.xpCost / 1000).toFixed(node.xpCost < 1000 ? 2 : 1).replace(".", ",")}k XP
          </text>
        </>
      )}
    </g>
  );
}

// ── Feature node (gold diamond) ───────────────────────────
const FEAT_R = 30; // half-size of diamond

function FeatureNode({
  node, state, isSelected, canAfford, onClick,
}: {
  node: SkillNode;
  state: "revealed" | "unlocked";
  isSelected: boolean;
  canAfford: boolean;
  onClick: () => void;
}) {
  const unlocked = state === "unlocked";
  const color    = "#f59e0b";
  const s = FEAT_R;
  // Diamond polygon points (rotated square)
  const pts = `${node.x},${node.y - s} ${node.x + s},${node.y} ${node.x},${node.y + s} ${node.x - s},${node.y}`;
  const outerPts = `${node.x},${node.y - s - 10} ${node.x + s + 10},${node.y} ${node.x},${node.y + s + 10} ${node.x - s - 10},${node.y}`;

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {/* Outer glow diamond when unlocked */}
      {unlocked && (
        <>
          <polygon points={outerPts} fill={color} opacity={0.07} />
          <polygon
            points={`${node.x},${node.y - s - 5} ${node.x + s + 5},${node.y} ${node.x},${node.y + s + 5} ${node.x - s - 5},${node.y}`}
            fill={color} opacity={0.12}
          />
        </>
      )}
      {/* Affordability pulse */}
      {!unlocked && canAfford && (
        <polygon points={outerPts} fill={color} opacity={0.14} />
      )}
      {/* Selection ring */}
      {isSelected && (
        <polygon points={outerPts} fill="none" stroke="white" strokeWidth={1.5} opacity={0.5} />
      )}
      {/* Main diamond */}
      <polygon
        points={pts}
        fill={unlocked ? `${color}35` : "#0b0b22"}
        stroke={unlocked ? color : canAfford ? `${color}90` : "#2a2a1a"}
        strokeWidth={isSelected ? 2.5 : unlocked ? 2 : 1.5}
        filter={unlocked ? "url(#glow-feature)" : isSelected ? "url(#glow-select)" : undefined}
      />
      {/* Icon */}
      {unlocked ? (
        <text x={node.x} y={node.y + 7} textAnchor="middle" fontSize={16} fill={color}>
          {node.icon}
        </text>
      ) : (
        <>
          <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={13}
            fill={canAfford ? color : "#3a3a1a"} opacity={canAfford ? 1 : 1}>
            {canAfford ? node.icon : "🔒"}
          </text>
          <text x={node.x} y={node.y + FEAT_R + 13} textAnchor="middle" fontSize={9}
            fill={canAfford ? color : "#3a3a1a"} opacity={canAfford ? 0.9 : 0.5}>
            {(node.xpCost / 1000).toFixed(node.xpCost < 1000 ? 2 : 1).replace(".", ",")}k XP
          </text>
        </>
      )}
    </g>
  );
}

// ── Unlock / detail panel ─────────────────────────────────
function UnlockPanel({
  node, state, canAfford, userXp, isPending, onUnlock, onClose,
}: {
  node:      SkillNode;
  state:     "revealed" | "unlocked";
  canAfford: boolean;
  userXp:    number;
  isPending: boolean;
  onUnlock:  () => void;
  onClose:   () => void;
}) {
  const unlocked = state === "unlocked";
  const missing  = node.xpCost - userXp;

  return (
    <div
      className="shrink-0 border-t border-white/10 px-4 py-3 flex gap-3 items-center"
      style={{ background: `${node.color}12` }}
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: `${node.color}22`, border: `1.5px solid ${node.color}50` }}
      >
        {unlocked ? node.icon : canAfford ? node.icon : "🔒"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: node.color }}>
          {node.nodeType === "feature" ? "✦ Feature" : (node.subjectKey ?? "Hub")} · Tier {node.tier}
        </p>
        <p className="text-sm font-black text-white leading-tight truncate">{node.label}</p>
        {node.featureDesc && (
          <p className="text-[10px] text-white/50 mt-0.5 leading-snug line-clamp-2">{node.featureDesc}</p>
        )}
        {unlocked ? (
          <p className="text-[11px] text-white/40 mt-0.5">Bereits freigeschaltet ✓</p>
        ) : canAfford ? (
          <p className="text-[11px] mt-0.5" style={{ color: node.color }}>
            {node.xpCost.toLocaleString("de-DE")} XP · Du hast {userXp.toLocaleString("de-DE")} XP
          </p>
        ) : (
          <p className="text-[11px] text-red-400/80 mt-0.5">
            Noch {missing.toLocaleString("de-DE")} XP fehlen
          </p>
        )}
      </div>

      {/* Action */}
      {!unlocked && (
        <button
          onClick={onUnlock}
          disabled={!canAfford || isPending}
          className="shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-40"
          style={{
            background: canAfford ? node.color : "#1a1a30",
            color: canAfford ? "white" : "#4a4a6a",
          }}
        >
          {isPending ? "..." : canAfford ? "Freischalten" : "Zu wenig XP"}
        </button>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="shrink-0 text-white/30 hover:text-white/70 text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
