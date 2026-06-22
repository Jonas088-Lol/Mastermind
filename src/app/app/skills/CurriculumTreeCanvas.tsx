"use client";

/**
 * CurriculumTreeCanvas.tsx
 * Extends the pan/zoom canvas approach with:
 *   – Momentum panning (inertia on pointer-up)
 *   – Wheel = pan (Ctrl/Meta+wheel = zoom)
 *   – Viewport culling (only render visible nodes)
 *   – Reveal animation for newly available nodes
 *   – Minimap overlay
 *   – Hub unlock via general-knowledge quiz
 *   – Node detail sheet with active quest list
 *   – Zoom-to-fit + recenter controls
 *   – prefers-reduced-motion support
 *   – Keyboard navigation (Tab + Enter/Space)
 */

import {
  useState, useRef, useEffect, useCallback,
  useReducer, useId,
} from "react";
import { X, RotateCcw, Maximize2, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import type { DisplayNode, DisplayEdge } from "@/lib/tree-generator";
import { TreeNodeStatus } from "@prisma/client";
import { Minimap } from "./Minimap";

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_SCALE   = 0.12;
const MAX_SCALE   = 2.2;
const FRICTION    = 0.88;       // momentum decay per frame
const MIN_VEL     = 0.5;        // px/frame below which we stop momentum
const CULL_MARGIN = 300;        // px beyond viewport to still render
const NODE_RADIUS: Record<DisplayNode["type"], number> = {
  hub: 52, subject: 36, fusion: 44,
};
const STATUS_OPACITY: Record<string, number> = {
  HIDDEN: 0, REVEALED: 0.35, AVAILABLE: 0.7, IN_PROGRESS: 0.9, MASTERED: 1,
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface ViewState { x: number; y: number; scale: number }
interface GKQuestion {
  id:       number;
  question: string;
  options:  string[];
}

interface Props {
  nodes:         DisplayNode[];
  edges:         DisplayEdge[];
  newlyRevealed?: Set<string>;   // IDs to animate on mount
}

// ── Reducer for view (avoids stale-closure issues in RAF) ─────────────────────
type ViewAction =
  | { type: "pan";    dx: number; dy: number }
  | { type: "zoom";   factor: number; cx: number; cy: number }
  | { type: "set";    view: ViewState }
  | { type: "vel";    vx: number; vy: number };

interface FullState { view: ViewState; vx: number; vy: number }

function viewReducer(state: FullState, action: ViewAction): FullState {
  const { view } = state;
  switch (action.type) {
    case "pan":
      return { ...state, view: { ...view, x: view.x + action.dx, y: view.y + action.dy } };
    case "zoom": {
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * action.factor));
      return { ...state, view: {
        scale: ns,
        x: action.cx - (action.cx - view.x) * (ns / view.scale),
        y: action.cy - (action.cy - view.y) * (ns / view.scale),
      }};
    }
    case "set":
      return { ...state, view: action.view, vx: 0, vy: 0 };
    case "vel":
      return { ...state, vx: action.vx, vy: action.vy };
    default:
      return state;
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function CurriculumTreeCanvas({ nodes, edges, newlyRevealed }: Props) {
  const descId = useId();

  const [state, dispatch] = useReducer(viewReducer, {
    view: { x: 0, y: 0, scale: 0.55 },
    vx: 0,
    vy: 0,
  });
  const { view } = state;

  const [selected,    setSelected]    = useState<DisplayNode | null>(null);
  const [containerSz, setContainerSz] = useState({ w: 800, h: 600 });
  const [gkQuestion,  setGkQuestion]  = useState<GKQuestion | null>(null);
  const [gkLoading,   setGkLoading]   = useState(false);
  const [gkAnswered,  setGkAnswered]  = useState<boolean | null>(null);
  const [unlocking,   setUnlocking]   = useState(false);

  // Reduced motion
  const prefersReducedMotion = useRef(
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number | null>(null);
  const stateRef     = useRef(state);
  stateRef.current   = state;

  // Pointer tracking
  const pointers   = useRef(new Map<number, { x: number; y: number; t: number }>());
  const panOrigin  = useRef({ bx: 0, by: 0, px: 0, py: 0 });
  const pinchDist  = useRef(0);
  const lastMove   = useRef({ x: 0, y: 0, t: 0 });
  const tapStart   = useRef<{ x: number; y: number } | null>(null);
  const wasDragging = useRef(false);

  // ── Centering ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setContainerSz({ w: r.width, h: r.height });
    dispatch({ type: "set", view: { x: r.width / 2, y: r.height * 0.35, scale: 0.55 } });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerSz({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Momentum RAF ──────────────────────────────────────────────────────────
  useEffect(() => {
    function tick() {
      const { vx, vy } = stateRef.current;
      if (Math.abs(vx) > MIN_VEL || Math.abs(vy) > MIN_VEL) {
        dispatch({ type: "pan", dx: vx, dy: vy });
        dispatch({ type: "vel", vx: vx * FRICTION, vy: vy * FRICTION });
        rafRef.current = requestAnimationFrame(tick);
      } else {
        dispatch({ type: "vel", vx: 0, vy: 0 });
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── Wheel handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1.12 : 0.88;
        const rect   = el.getBoundingClientRect();
        dispatch({ type: "zoom", factor, cx: e.clientX - rect.left, cy: e.clientY - rect.top });
      } else {
        const dx = e.shiftKey && e.deltaX === 0 ? -e.deltaY : -e.deltaX;
        const dy = e.shiftKey && e.deltaX === 0 ? 0          : -e.deltaY;
        dispatch({ type: "pan", dx, dy });
        // Gentle inertia from trackpad
        dispatch({ type: "vel", vx: dx * 0.3, vy: dy * 0.3 });
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pt = { x: e.clientX, y: e.clientY, t: Date.now() };
    pointers.current.set(e.pointerId, pt);
    tapStart.current = { x: e.clientX, y: e.clientY };
    wasDragging.current = false;

    if (pointers.current.size === 1) {
      const { x: vx, y: vy } = stateRef.current.view;
      panOrigin.current = { bx: vx, by: vy, px: e.clientX, py: e.clientY };
      lastMove.current  = { x: e.clientX, y: e.clientY, t: Date.now() };
      dispatch({ type: "vel", vx: 0, vy: 0 });
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinchDist.current = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, t: Date.now() });

    if (pointers.current.size === 1) {
      const { bx, by, px, py } = panOrigin.current;
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) wasDragging.current = true;

      const now = Date.now();
      const dt  = now - lastMove.current.t;
      if (dt > 0) {
        dispatch({ type: "vel",
          vx: (e.clientX - lastMove.current.x) / dt * 16,
          vy: (e.clientY - lastMove.current.y) / dt * 16,
        });
      }
      lastMove.current = { x: e.clientX, y: e.clientY, t: now };
      dispatch({ type: "set", view: { ...stateRef.current.view, x: bx + dx, y: by + dy } });
      // Reset velocity-only version
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
      if (pinchDist.current) {
        const factor = dist / pinchDist.current;
        const cx = (pts[0]!.x + pts[1]!.x) / 2;
        const cy = (pts[0]!.y + pts[1]!.y) / 2;
        const rect = containerRef.current!.getBoundingClientRect();
        dispatch({ type: "zoom", factor, cx: cx - rect.left, cy: cy - rect.top });
      }
      pinchDist.current = dist;
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);

    if (!wasDragging.current && tapStart.current) {
      const dx = Math.abs(e.clientX - tapStart.current.x);
      const dy = Math.abs(e.clientY - tapStart.current.y);
      if (dx < 8 && dy < 8) {
        // Tap — find node
        const v  = stateRef.current.view;
        const wx = (e.clientX - v.x) / v.scale;
        const wy = (e.clientY - v.y) / v.scale;
        let best: DisplayNode | null = null;
        let bestD = Infinity;
        for (const node of nodes) {
          if (node.status === TreeNodeStatus.HIDDEN) continue;
          const r = NODE_RADIUS[node.type] + 12;
          const d = Math.hypot(wx - node.x, wy - node.y);
          if (d < r && d < bestD) { bestD = d; best = node; }
        }
        if (best) handleNodeTap(best);
      }
    }
    tapStart.current = null;
  }, [nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Node tap ──────────────────────────────────────────────────────────────
  function handleNodeTap(node: DisplayNode) {
    setSelected(node);
    setGkQuestion(null);
    setGkAnswered(null);

    if (node.isHub && node.status === TreeNodeStatus.AVAILABLE) {
      loadGKQuestion();
    }
  }

  async function loadGKQuestion() {
    setGkLoading(true);
    try {
      const r = await fetch("/api/tree/unlock-center");
      if (r.ok) setGkQuestion(await r.json());
    } finally { setGkLoading(false); }
  }

  async function submitGKAnswer(questionId: number, answer: number) {
    setUnlocking(true);
    try {
      const r  = await fetch("/api/tree/unlock-center", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ questionId, answer }),
      });
      const data: { correct: boolean } = await r.json();
      setGkAnswered(data.correct);
      if (data.correct) {
        // Reload page to get fresh tree state
        setTimeout(() => window.location.reload(), 1200);
      }
    } finally { setUnlocking(false); }
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  function zoomToFit() {
    if (nodes.length === 0) return;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - 120;
    const maxX = Math.max(...xs) + 120;
    const minY = Math.min(...ys) - 120;
    const maxY = Math.max(...ys) + 120;
    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const scaleX = containerSz.w / worldW;
    const scaleY = containerSz.h / worldH;
    const s      = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(scaleX, scaleY) * 0.9));
    dispatch({ type: "set", view: {
      scale: s,
      x:     containerSz.w / 2 - ((minX + maxX) / 2) * s,
      y:     containerSz.h / 2 - ((minY + maxY) / 2) * s,
    }});
  }

  function recenter() {
    const target = selected ?? { x: 0, y: 0 };
    dispatch({ type: "set", view: {
      scale: 0.8,
      x: containerSz.w / 2 - target.x * 0.8,
      y: containerSz.h / 2 - target.y * 0.8,
    }});
  }

  function panToWorld(wx: number, wy: number) {
    dispatch({ type: "set", view: {
      ...stateRef.current.view,
      x: containerSz.w / 2 - wx * stateRef.current.view.scale,
      y: containerSz.h / 2 - wy * stateRef.current.view.scale,
    }});
  }

  // ── Viewport culling ──────────────────────────────────────────────────────
  const visibleNodes = nodes.filter((n) => {
    if (n.status === TreeNodeStatus.HIDDEN) return false;
    const nx = n.x * view.scale + view.x;
    const ny = n.y * view.scale + view.y;
    const r  = NODE_RADIUS[n.type] * view.scale + CULL_MARGIN;
    return nx + r > 0 && nx - r < containerSz.w &&
           ny + r > 0 && ny - r < containerSz.h;
  });
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) => visibleIds.has(e.fromId) || visibleIds.has(e.toId),
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const selNode = selected ? nodes.find((n) => n.id === selected.id) ?? null : null;

  return (
    <div
      role="application"
      aria-label="Skill-Baum"
      aria-describedby={descId}
      className="relative bg-[#060a10] touch-none select-none overflow-hidden"
      style={{ height: "calc(100dvh - 152px)", minHeight: 400 }}
    >
      <p id={descId} className="sr-only">
        Interaktiver Skill-Baum. Ziehen zum Bewegen, Pinchen oder Strg+Rad zum Zoomen.
      </p>

      {/* Starfield */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: "radial-gradient(circle, #ffffff0a 1px, transparent 1px)", backgroundSize: "36px 36px" }} />

      {/* CSS animations */}
      <style>{`
        @keyframes node-reveal {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes edge-flow {
          to { stroke-dashoffset: -32; }
        }
        @keyframes hub-pulse {
          0%,100% { box-shadow: 0 0 40px #f59e0b44, 0 0 80px #f59e0b22; }
          50%      { box-shadow: 0 0 60px #f59e0b66, 0 0 120px #f59e0b33; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes node-reveal { from { opacity:0 } to { opacity:1 } }
          @keyframes edge-flow   { }
          @keyframes hub-pulse   { }
        }
      `}</style>

      {/* Pan/zoom container */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            transform:  `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            willChange: "transform",
          }}
        >
          {/* SVG edges */}
          <svg style={{ position: "absolute", overflow: "visible", pointerEvents: "none", top: 0, left: 0 }}>
            <defs>
              <filter id="glow-edge">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {visibleEdges.map((edge) => {
              const from = nodes.find((n) => n.id === edge.fromId);
              const to   = nodes.find((n) => n.id === edge.toId);
              if (!from || !to) return null;
              const cy = (from.y + to.y) / 2;
              const d  = `M${from.x},${from.y} C${from.x},${cy} ${to.x},${cy} ${to.x},${to.y}`;
              const color = from.color;
              return (
                <g key={`${edge.fromId}-${edge.toId}`}>
                  <path d={d} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.15} />
                  {edge.active && (
                    <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.6}
                      strokeDasharray="6 10"
                      style={{ animation: "edge-flow 2.5s linear infinite" }}
                      filter="url(#glow-edge)"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {visibleNodes.map((node) => {
            const r       = NODE_RADIUS[node.type];
            const opacity = STATUS_OPACITY[node.status] ?? 0;
            const isSelected = selNode?.id === node.id;
            const isNew   = newlyRevealed?.has(node.id) && !prefersReducedMotion.current;
            const isMastered  = node.status === TreeNodeStatus.MASTERED;
            const isAvailable = node.status === TreeNodeStatus.AVAILABLE ||
                                 node.status === TreeNodeStatus.IN_PROGRESS;

            const borderColor = isSelected ? "#ffffff"
              : isMastered  ? node.color
              : isAvailable ? `${node.color}80`
              : "#1e2a3a";

            const bg = isMastered  ? `${node.color}22`
              : isAvailable ? "#111827"
              : "#0d1726";

            const glow = isMastered
              ? `0 0 24px ${node.color}66, 0 0 6px ${node.color}44`
              : isSelected
              ? `0 0 20px ${node.color}44`
              : node.isHub && isAvailable
              ? undefined  // hub-pulse via CSS
              : "none";

            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={`${node.title} — ${node.status}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleNodeTap(node); }
                }}
                style={{
                  position:    "absolute",
                  left:        node.x - r,
                  top:         node.y - r,
                  width:       r * 2,
                  height:      r * 2,
                  borderRadius: node.type === "hub" ? "50%" : node.type === "fusion" ? "30%" : "12px",
                  background:  bg,
                  border:      `2px solid ${borderColor}`,
                  boxShadow:   glow ?? undefined,
                  opacity,
                  display:     "flex",
                  flexDirection: "column",
                  alignItems:  "center",
                  justifyContent: "center",
                  cursor:      "pointer",
                  transition:  "border-color 0.2s, box-shadow 0.2s",
                  animation:   isNew ? "node-reveal 0.5s ease backwards" : node.isHub && isAvailable ? "hub-pulse 3s ease-in-out infinite" : undefined,
                }}
              >
                <span style={{ fontSize: node.type === "hub" ? 26 : 18, lineHeight: 1 }}>
                  {node.status === TreeNodeStatus.HIDDEN || node.status === TreeNodeStatus.REVEALED
                    ? "🔒"
                    : node.icon}
                </span>

                {/* Progress pip for IN_PROGRESS */}
                {node.status === TreeNodeStatus.IN_PROGRESS && (
                  <div style={{
                    position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
                    width: 32, height: 3, borderRadius: 2, background: "#1e2a3a",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      width: `${Math.round((node.questsDone / node.questsNeeded) * 100)}%`,
                      background: node.color,
                    }} />
                  </div>
                )}

                {/* Title label */}
                <div style={{
                  position: "absolute",
                  top:      r * 2 + 6,
                  left:     "50%",
                  transform:"translateX(-50%)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: isMastered ? node.color : "#4b5563",
                  whiteSpace: "nowrap",
                  maxWidth: 90,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textAlign: "center",
                  letterSpacing: "0.02em",
                  pointerEvents: "none",
                }}>
                  {node.status !== TreeNodeStatus.HIDDEN ? node.title : "???"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Minimap */}
      <Minimap
        nodes={nodes.filter((n) => n.status !== TreeNodeStatus.HIDDEN)}
        viewX={view.x}
        viewY={view.y}
        scale={view.scale}
        width={containerSz.w}
        height={containerSz.h}
        onPan={panToWorld}
      />

      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
        {[
          { icon: <ZoomIn className="size-3.5" />,  label: "Vergrößern",  fn: () => dispatch({ type: "zoom", factor: 1.2, cx: containerSz.w / 2, cy: containerSz.h / 2 }) },
          { icon: <ZoomOut className="size-3.5" />, label: "Verkleinern", fn: () => dispatch({ type: "zoom", factor: 0.8, cx: containerSz.w / 2, cy: containerSz.h / 2 }) },
          { icon: <Maximize2 className="size-3.5" />, label: "Alles zeigen", fn: zoomToFit },
          { icon: <RotateCcw className="size-3.5" />, label: "Zurücksetzen", fn: recenter },
        ].map(({ icon, label, fn }) => (
          <button
            key={label}
            aria-label={label}
            onClick={fn}
            className="size-9 rounded-xl border border-white/10 bg-black/60 backdrop-blur text-white/70 hover:text-white hover:border-white/30 flex items-center justify-center transition-colors"
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Hint */}
      {!selNode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <p className="rounded-full border border-white/10 bg-black/60 backdrop-blur px-4 py-1.5 text-[11px] text-white/30">
            Tippe auf einen Knoten · Pinch/Strg+Rad zum Zoomen
          </p>
        </div>
      )}

      {/* ── Detail Sheet ── */}
      {selNode && (
        <div
          className="absolute inset-x-0 bottom-0 z-40 max-h-[70%] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#0d1117] shadow-2xl"
          style={{ animation: "sheet-in 0.25s ease" }}
          role="dialog"
          aria-label={`Details: ${selNode.title}`}
        >
          <style>{`
            @keyframes sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
          `}</style>

          <div className="flex items-start justify-between px-5 pt-5 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ background: `${selNode.color}18`, border: `1.5px solid ${selNode.color}40` }}>
                {selNode.status === TreeNodeStatus.HIDDEN || selNode.status === TreeNodeStatus.REVEALED
                  ? "🔒" : selNode.icon}
              </div>
              <div>
                <h2 className="text-base font-black text-white">{selNode.title}</h2>
                <div className="mt-0.5 flex items-center gap-2">
                  {selNode.subjectLabel && (
                    <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                      style={{ background: `${selNode.color}18`, color: selNode.color }}>
                      {selNode.subjectLabel}
                    </span>
                  )}
                  <span className="text-[10px] text-white/30">
                    {selNode.status === "MASTERED" ? "✓ Gemeistert"
                    : selNode.status === "IN_PROGRESS" ? "⚡ In Bearbeitung"
                    : selNode.status === "AVAILABLE" ? "🔓 Verfügbar"
                    : selNode.status === "REVEALED" ? "👁 Erreichbar bald"
                    : "🔒 Gesperrt"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setSelected(null); setGkQuestion(null); setGkAnswered(null); }}
              className="rounded-lg border border-white/10 p-1.5 text-white/30 hover:text-white"
              aria-label="Schließen"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="px-5 pb-6">
            <p className="text-sm text-white/60 leading-relaxed">{selNode.description}</p>

            {/* Quest progress */}
            {(selNode.status === TreeNodeStatus.IN_PROGRESS || selNode.status === TreeNodeStatus.AVAILABLE) && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-white/50">Fortschritt</span>
                  <span className="text-white/30">{selNode.questsDone}/{selNode.questsNeeded} Quests</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((selNode.questsDone / selNode.questsNeeded) * 100)}%`,
                      background: `linear-gradient(90deg, ${selNode.color}, ${selNode.color}bb)`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-white/30">
                  Absolviere Quests in deinen aktiven Fächern, um diesen Knoten freizuschalten.
                  Tageslimit: {3} Fortschrittspunkte.
                </p>
              </div>
            )}

            {/* Hub unlock quiz */}
            {selNode.isHub && selNode.status === TreeNodeStatus.AVAILABLE && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs font-bold text-amber-400 mb-3">
                  🌟 Allgemeinwissen-Probe
                </p>
                {gkLoading && (
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <Loader2 className="size-4 animate-spin" /> Frage wird geladen…
                  </div>
                )}
                {!gkLoading && !gkQuestion && !gkAnswered && (
                  <button
                    onClick={loadGKQuestion}
                    className="w-full rounded-xl py-2.5 text-sm font-bold text-white bg-amber-500 active:scale-95 transition-all"
                  >
                    Frage starten
                  </button>
                )}
                {gkQuestion && gkAnswered === null && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white">{gkQuestion.question}</p>
                    <div className="grid gap-2">
                      {gkQuestion.options.map((opt, i) => (
                        <button
                          key={i}
                          disabled={unlocking}
                          onClick={() => submitGKAnswer(gkQuestion.id, i)}
                          className="text-left rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 hover:border-amber-500/60 hover:bg-amber-500/10 transition-all"
                        >
                          <span className="mr-2 font-black text-white/30">{["A","B","C","D"][i]}</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {gkAnswered === true  && <p className="text-green-400 font-bold text-sm">⚡ Richtig! Baum wird geöffnet…</p>}
                {gkAnswered === false && (
                  <div className="space-y-2">
                    <p className="text-red-400 text-sm">Leider falsch. Versuch es nochmal!</p>
                    <button onClick={loadGKQuestion} className="text-xs text-amber-400 underline">Neue Frage</button>
                  </div>
                )}
              </div>
            )}

            {selNode.status === TreeNodeStatus.MASTERED && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border py-2.5 px-4 text-sm font-bold"
                style={{ borderColor: `${selNode.color}40`, color: selNode.color, background: `${selNode.color}0a` }}>
                🏆 Gemeistert!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
