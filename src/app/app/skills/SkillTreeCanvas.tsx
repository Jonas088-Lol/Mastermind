/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { X, ChevronRight, Loader2, Zap, RotateCcw } from "lucide-react";
import {
  SKILL_GRAPH, SKILL_MAP,
  MASTERY_BADGE_COLORS, MASTERY_GLOW, MASTERY_ICONS, MASTERY_LABELS,
  type MasteryLevel, type SkillNode,
} from "@/lib/skill-graph";
import { practiceAnswer, unlockNode } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MasteryEntry { tier: MasteryLevel; progress: number }
export interface QuestionPayload {
  id: string; question: string; subject: string; grade: number;
  options: { id: number; text: string }[];
}

interface CanvasProps {
  masteryMap: Record<string, MasteryEntry>;
  userXp: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_SIZES: Record<SkillNode["type"], number> = {
  hub: 88, subject: 60, fusion: 72, legendary: 96,
};
const MIN_SCALE = 0.18;
const MAX_SCALE = 1.8;
const TAP_THRESHOLD = 8; // px

// ── Helpers ───────────────────────────────────────────────────────────────────
function edgeKey(a: string, b: string) { return `${a}→${b}`; }

function getMasteryColor(tier: MasteryLevel, node: SkillNode) {
  if (tier === 0) return "#1f2937";
  if (tier === 3) return node.color;
  return MASTERY_BADGE_COLORS[tier];
}

function isNodeAvailable(slug: string, masteryMap: Record<string, MasteryEntry>, userXp: number): boolean {
  const node = SKILL_MAP.get(slug);
  if (!node) return false;
  if (userXp < node.requiredXp) return false;
  if (node.prerequisites.length === 0) return true;
  return node.prerequisites.every((p) => (masteryMap[p]?.tier ?? 0) >= 1);
}

// ── Main Component ────────────────────────────────────────────────────────────
export function SkillTreeCanvas({ masteryMap: initialMap, userXp }: CanvasProps) {
  const [mastery, setMastery] = useState(initialMap);
  const [view, setView]     = useState({ x: 0, y: 0, scale: 0.52 });
  const [selected, setSelected] = useState<SkillNode | null>(null);
  const [phase, setPhase]   = useState<"idle"|"loading"|"question"|"result">("idle");
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers     = useRef(new Map<number, { x: number; y: number }>());
  const panOrigin    = useRef({ bx: 0, by: 0, px: 0, py: 0 }); // base+pointer start
  const pinchDist    = useRef(0);
  const tapStart     = useRef<{ x: number; y: number; t: number } | null>(null);
  const viewRef      = useRef(view);
  viewRef.current    = view;

  // Center on hub on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setView({ x: width / 2, y: height * 0.28, scale: 0.52 });
  }, []);

  // ── Pointer handlers ───────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tapStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    if (pointers.current.size === 1) {
      const v = viewRef.current;
      panOrigin.current = { bx: v.x, by: v.y, px: e.clientX, py: e.clientY };
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinchDist.current = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      const { bx, by, px, py } = panOrigin.current;
      setView((v) => ({ ...v, x: bx + (e.clientX - px), y: by + (e.clientY - py) }));
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
      if (pinchDist.current) {
        const factor = dist / pinchDist.current;
        const mx = (pts[0]!.x + pts[1]!.x) / 2;
        const my = (pts[0]!.y + pts[1]!.y) / 2;
        setView((v) => {
          const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
          return { scale: ns, x: mx - (mx - v.x) * (ns / v.scale), y: my - (my - v.y) * (ns / v.scale) };
        });
      }
      pinchDist.current = dist;
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const start = tapStart.current;
    if (start && Date.now() - start.t < 500) {
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
        // Convert screen tap → world coords
        const v = viewRef.current;
        const wx = (e.clientX - v.x) / v.scale;
        const wy = (e.clientY - v.y) / v.scale;
        // Find nearest node within tap radius
        let best: SkillNode | null = null;
        let bestD = Infinity;
        for (const node of SKILL_GRAPH) {
          const sz = NODE_SIZES[node.type] / 2;
          const d  = Math.hypot(wx - node.x, wy - node.y);
          if (d < sz + 10 && d < bestD) { bestD = d; best = node; }
        }
        if (best) { setSelected(best); setPhase("idle"); setQuestion(null); setSelectedOpt(null); setLastCorrect(null); }
      }
    }
    pointers.current.delete(e.pointerId);
    tapStart.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect   = containerRef.current!.getBoundingClientRect();
    const cx     = e.clientX - rect.left;
    const cy     = e.clientY - rect.top;
    setView((v) => {
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      return { scale: ns, x: cx - (cx - v.x) * (ns / v.scale), y: cy - (cy - v.y) * (ns / v.scale) };
    });
  }, []);

  // Recenter on hub or on selected node
  const recenter = () => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (selected) {
      setView({ x: width / 2 - selected.x * 0.7, y: height / 2 - selected.y * 0.7, scale: 0.7 });
    } else {
      setView({ x: width / 2, y: height * 0.28, scale: 0.52 });
    }
  };

  // ── Practice ──────────────────────────────────────────────────────────────
  async function startPractice() {
    if (!selected) return;
    setPhase("loading");
    try {
      const r = await fetch(`/api/skills/${selected.slug}/question`);
      if (!r.ok) { setPhase("idle"); return; }
      setQuestion(await r.json());
      setPhase("question");
      setSelectedOpt(null);
      setLastCorrect(null);
    } catch { setPhase("idle"); }
  }

  function selectAnswer(idx: number) {
    if (selectedOpt !== null || !question || !selected) return;
    setSelectedOpt(idx);
    startTransition(async () => {
      const result = await practiceAnswer(selected.slug, question.id, idx);
      setLastCorrect(result.correct);
      if (result.correct && result.newMastery) {
        setMastery((m) => ({ ...m, [selected.slug]: result.newMastery! }));
      }
      setPhase("result");
    });
  }

  async function handleUnlock() {
    if (!selected) return;
    await unlockNode(selected.slug);
    setMastery((m) => ({ ...m, [selected.slug]: { tier: 1, progress: 0 } }));
    setPhase("idle");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  // Build edge list
  const edges: { from: SkillNode; to: SkillNode; active: boolean }[] = [];
  for (const node of SKILL_GRAPH) {
    for (const prereqSlug of node.prerequisites) {
      const from = SKILL_MAP.get(prereqSlug);
      if (from) {
        const active = (mastery[prereqSlug]?.tier ?? 0) >= 1;
        edges.push({ from, to: node, active });
      }
    }
  }

  const selMastery = selected ? (mastery[selected.slug] ?? { tier: 0, progress: 0 }) : null;
  const selAvail   = selected ? isNodeAvailable(selected.slug, mastery, userXp) : false;

  return (
    <div className="relative" style={{ height: "calc(100dvh - 160px)", minHeight: 400 }}>
      {/* Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden bg-[#080c14] cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* Starfield background */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "radial-gradient(circle, #ffffff08 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* World container */}
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, willChange: "transform" }}
        >
          {/* SVG edges */}
          <svg
            style={{ position: "absolute", overflow: "visible", pointerEvents: "none", top: 0, left: 0 }}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {edges.map(({ from, to, active }) => {
              const key = edgeKey(from.slug, to.slug);
              const x1 = from.x, y1 = from.y;
              const x2 = to.x,   y2 = to.y;
              const cy = (y1 + y2) / 2;
              const d  = `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`;
              if (active) {
                return (
                  <g key={key}>
                    <path d={d} fill="none" stroke={from.color} strokeWidth={2.5} strokeOpacity={0.25} />
                    <path d={d} fill="none" stroke={from.color} strokeWidth={1.5} strokeOpacity={0.7}
                      strokeDasharray="6 10"
                      style={{ animation: "edge-flow 2s linear infinite" }}
                    />
                  </g>
                );
              }
              return <path key={key} d={d} fill="none" stroke="#1e2a3a" strokeWidth={1.5} />;
            })}
          </svg>

          {/* Nodes */}
          {SKILL_GRAPH.map((node) => {
            const m    = mastery[node.slug] ?? { tier: 0, progress: 0 };
            const tier = m.tier as MasteryLevel;
            const sz   = NODE_SIZES[node.type];
            const avail = tier === 0 && isNodeAvailable(node.slug, mastery, userXp);
            const isSelected = selected?.slug === node.slug;

            let bg = "#0d1726";
            let border = "#1e2a3a";
            let glow = "none";
            if (tier >= 1) {
              bg     = `${node.color}1a`;
              border = `${node.color}80`;
              glow   = `0 0 ${tier === 3 ? "28px" : "16px"} ${MASTERY_GLOW[tier]}, 0 0 6px ${MASTERY_GLOW[tier]}`;
            } else if (avail) {
              bg     = "#111827";
              border = "#374151";
            }
            if (isSelected) {
              border = node.color;
              glow   = `0 0 30px ${node.color}66, 0 0 8px ${node.color}44`;
            }

            return (
              <div
                key={node.slug}
                style={{
                  position: "absolute",
                  left:  node.x - sz / 2,
                  top:   node.y - sz / 2,
                  width: sz,
                  height: sz,
                  background: bg,
                  border: `2px solid ${border}`,
                  borderRadius: node.type === "hub" || node.type === "legendary" ? "50%" : "14px",
                  boxShadow: glow,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  opacity: tier === 0 && !avail ? 0.35 : 1,
                  transition: "box-shadow 0.2s, border-color 0.2s",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: node.type === "legendary" ? 30 : node.type === "hub" ? 28 : 20, lineHeight: 1 }}>
                  {tier === 0 && !avail ? "🔒" : node.icon}
                </span>
                {tier >= 1 && (
                  <span style={{ fontSize: 9, fontWeight: 900, color: MASTERY_BADGE_COLORS[tier], marginTop: 2, letterSpacing: "0.04em" }}>
                    {MASTERY_ICONS[tier]}
                  </span>
                )}

                {/* Title below node */}
                <div style={{
                  position: "absolute", top: sz + 4, left: "50%", transform: "translateX(-50%)",
                  fontSize: 9, fontWeight: 700, color: tier >= 1 ? node.color : "#4b5563",
                  whiteSpace: "nowrap", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis",
                  textAlign: "center", letterSpacing: "0.02em",
                }}>
                  {node.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSS for edge flow animation */}
      <style>{`
        @keyframes edge-flow { to { stroke-dashoffset: -32; } }
      `}</style>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
        <button onClick={() => setView((v) => ({ ...v, scale: Math.min(MAX_SCALE, v.scale * 1.2) }))}
          className="size-9 rounded-xl border border-white/10 bg-black/60 backdrop-blur text-white text-lg font-bold flex items-center justify-center">
          +
        </button>
        <button onClick={() => setView((v) => ({ ...v, scale: Math.max(MIN_SCALE, v.scale / 1.2) }))}
          className="size-9 rounded-xl border border-white/10 bg-black/60 backdrop-blur text-white text-lg font-bold flex items-center justify-center">
          −
        </button>
        <button onClick={recenter}
          className="size-9 rounded-xl border border-white/10 bg-black/60 backdrop-blur text-white flex items-center justify-center">
          <RotateCcw className="size-4" />
        </button>
      </div>

      {/* XP display */}
      <div className="absolute top-3 left-3 z-20 rounded-xl border border-white/10 bg-black/60 backdrop-blur px-3 py-1.5 flex items-center gap-2">
        <Zap className="size-3.5 text-amber-400" />
        <span className="text-xs font-bold text-amber-400">{userXp.toLocaleString("de-DE")} XP</span>
      </div>

      {/* Bottom sheet */}
      {selected && (
        <div
          className="absolute inset-x-0 bottom-0 z-30 max-h-[75%] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#0d1117] shadow-2xl"
          style={{ animation: "sheet-in 0.25s ease" }}
        >
          <style>{`@keyframes sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

          {/* Handle + close */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="h-1 w-10 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
            <div />
            <button onClick={() => { setSelected(null); setPhase("idle"); }}
              className="ml-auto rounded-lg border border-white/10 p-1 text-white/40 hover:text-white">
              <X className="size-4" />
            </button>
          </div>

          {/* Node header */}
          <div className="px-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                style={{ background: `${selected.color}18`, border: `1.5px solid ${selected.color}50` }}>
                {selected.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-white leading-tight">{selected.title}</h2>
                <div className="mt-0.5 flex items-center gap-2">
                  {selected.subjects?.map((s) => (
                    <span key={s} className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                      style={{ background: `${selected.color}18`, color: selected.color }}>
                      {s}
                    </span>
                  )) ?? selected.subject ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                      style={{ background: `${selected.color}18`, color: selected.color }}>
                      {selected.subject}
                    </span>
                  ) : null}
                  <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                    style={{ background: `${MASTERY_BADGE_COLORS[selMastery!.tier]}18`, color: MASTERY_BADGE_COLORS[selMastery!.tier] }}>
                    {MASTERY_ICONS[selMastery!.tier]} {MASTERY_LABELS[selMastery!.tier]}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm text-white/65 leading-relaxed">{selected.desc}</p>
            {selected.flavor && (
              <p className="mt-2 text-xs italic text-white/35 border-l-2 pl-3" style={{ borderColor: selected.color }}>
                {selected.flavor}
              </p>
            )}

            {/* Mastery progress */}
            {selMastery!.tier >= 1 && (
              <div className="mt-4 space-y-2">
                {[1, 2, 3].map((tier) => {
                  const req   = selected.masteryReqs[tier - 1]!;
                  const done  = tier < selMastery!.tier ? req : tier === selMastery!.tier ? selMastery!.progress : 0;
                  const pct   = Math.min(100, Math.round((done / req) * 100));
                  const color = MASTERY_BADGE_COLORS[tier as MasteryLevel];
                  return (
                    <div key={tier}>
                      <div className="flex items-center justify-between text-[10px] font-semibold mb-0.5">
                        <span style={{ color }}>{MASTERY_ICONS[tier as MasteryLevel]} {MASTERY_LABELS[tier as MasteryLevel]}</span>
                        <span className="text-white/40">{done}/{req}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: tier <= selMastery!.tier ? color : "#1f2937" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* XP requirement */}
            {selected.requiredXp > 0 && selMastery!.tier === 0 && !selAvail && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <Zap className="size-3.5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-400">
                  Benötigt <strong>{selected.requiredXp.toLocaleString("de-DE")} XP</strong>
                  {" "}(du hast {userXp.toLocaleString("de-DE")} XP)
                </p>
              </div>
            )}

            {/* Prerequisites not met */}
            {!selAvail && selMastery!.tier === 0 && selected.requiredXp <= userXp && selected.prerequisites.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Voraussetzungen</p>
                {selected.prerequisites.map((p) => {
                  const pNode = SKILL_MAP.get(p);
                  const met   = (mastery[p]?.tier ?? 0) >= 1;
                  return pNode ? (
                    <div key={p} className={`flex items-center gap-2 text-xs ${met ? "text-green-400" : "text-red-400"}`}>
                      <span>{met ? "✓" : "✗"}</span>
                      <span>{pNode.icon} {pNode.title}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Practice area */}
          <div className="border-t border-white/5 px-5 pb-6 pt-4">

            {/* IDLE: unlock or practice button */}
            {phase === "idle" && (
              selMastery!.tier === 0 ? (
                <button
                  onClick={handleUnlock}
                  disabled={!selAvail}
                  className="w-full rounded-2xl py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: selAvail ? `linear-gradient(135deg, ${selected.color}, ${selected.color}bb)` : "#1f2937" }}
                >
                  {selAvail ? "⚡ Freischalten" : "🔒 Gesperrt"}
                </button>
              ) : selMastery!.tier < 3 ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-white/30 text-center uppercase tracking-widest">
                    {selected.masteryReqs[selMastery!.tier - 1] - selMastery!.progress} Übungen bis {MASTERY_LABELS[selMastery!.tier + 1 as MasteryLevel]}
                  </p>
                  <button
                    onClick={startPractice}
                    className="w-full rounded-2xl py-3 text-sm font-bold text-white transition-all active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${selected.color}, ${selected.color}bb)` }}
                  >
                    🎯 Üben
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold"
                  style={{ borderColor: `${selected.color}40`, color: selected.color, background: `${selected.color}0a` }}>
                  🥇 Gold gemeistert!
                </div>
              )
            )}

            {/* LOADING */}
            {phase === "loading" && (
              <div className="flex items-center justify-center gap-3 py-6">
                <Loader2 className="size-5 animate-spin text-white/40" />
                <span className="text-sm text-white/40">Frage wird geladen…</span>
              </div>
            )}

            {/* QUESTION */}
            {phase === "question" && question && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                    {question.subject} · Klasse {question.grade}
                  </span>
                  <ChevronRight className="size-3 text-white/20" />
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">{question.question}</p>
                <div className="grid gap-2">
                  {question.options.map((opt) => (
                    <button
                      key={opt.id}
                      disabled={selectedOpt !== null || isPending}
                      onClick={() => selectAnswer(opt.id)}
                      className="flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left text-sm font-medium text-white transition-all active:scale-95"
                      style={{
                        borderColor: selectedOpt === opt.id ? selected.color : "#1e2a3a",
                        background:  selectedOpt === opt.id ? `${selected.color}1a` : "#111827",
                      }}
                    >
                      <span className="size-6 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black text-white/50">
                        {["A","B","C","D"][opt.id]}
                      </span>
                      {opt.text}
                    </button>
                  ))}
                </div>
                {isPending && <p className="text-center text-xs text-white/30 animate-pulse">Auswertung…</p>}
              </div>
            )}

            {/* RESULT */}
            {phase === "result" && (
              <div className="space-y-3">
                <div className={`rounded-2xl border-2 p-4 text-center ${lastCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <p className={`text-lg font-black ${lastCorrect ? "text-green-400" : "text-red-400"}`}>
                    {lastCorrect ? "⚡ Richtig! +1 Fortschritt" : "🛡️ Falsch — kein Fortschritt"}
                  </p>
                  {lastCorrect && selMastery && mastery[selected.slug]?.tier !== undefined && (
                    <p className="mt-1 text-xs text-white/40">
                      {mastery[selected.slug].progress}/{selected.masteryReqs[mastery[selected.slug].tier - 1]}
                      {" "}Übungen für {MASTERY_LABELS[mastery[selected.slug].tier]}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setPhase("idle"); setQuestion(null); }}
                    className="rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/60">
                    Fertig
                  </button>
                  <button onClick={startPractice}
                    className="rounded-xl py-2.5 text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${selected.color}, ${selected.color}bb)` }}>
                    Nochmal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tap hint */}
      {!selected && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <p className="rounded-full border border-white/10 bg-black/60 backdrop-blur px-4 py-1.5 text-[11px] text-white/30">
            Tippe auf einen Knoten · Scrollen/Pinchen zum Zoomen
          </p>
        </div>
      )}
    </div>
  );
}
