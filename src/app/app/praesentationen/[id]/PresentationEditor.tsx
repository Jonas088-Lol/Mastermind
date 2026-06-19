"use client";

import {
  useCallback, useEffect, useRef, useState, useTransition,
} from "react";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold,
  ChevronLeft, ChevronRight, Copy, Image, Italic,
  Maximize2, Minimize2, Plus, Trash2, Type, Underline,
} from "lucide-react";
import Link from "next/link";
import { nanoid } from "@/lib/utils";
import { savePresentationSlides, renamePresentation, deletePresentation } from "../actions";

// ── Types ─────────────────────────────────────────────────────────────────

type ElType = "text" | "title" | "subtitle" | "image" | "shape";
type Align  = "left" | "center" | "right";
type ShapeType = "rect" | "circle" | "triangle";
type Transition = "none" | "fade" | "slide" | "zoom";

interface SlideElement {
  id: string;
  type: ElType;
  x: number; y: number; w: number; h: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: Align;
  bg: string;
  opacity: number;
  shapeType?: ShapeType;
}

interface Slide {
  id: string;
  background: string;
  elements: SlideElement[];
  notes: string;
  transition?: Transition;
}

const TRANSITIONS: { value: Transition; label: string }[] = [
  { value: "none",  label: "Kein Übergang" },
  { value: "fade",  label: "Einblenden" },
  { value: "slide", label: "Hineinschieben" },
  { value: "zoom",  label: "Einzoomen" },
];

// ── Themes ────────────────────────────────────────────────────────────────

const THEMES = [
  { name: "Weiß",     bg: "#ffffff", title: "#1a1a1a", text: "#374151" },
  { name: "Dunkel",   bg: "#0f172a", title: "#f1f5f9", text: "#94a3b8" },
  { name: "Teal",     bg: "#0d3d3d", title: "#ccfbf1", text: "#99f6e4" },
  { name: "Blau",     bg: "#1e3a8a", title: "#dbeafe", text: "#bfdbfe" },
  { name: "Grün",     bg: "#14532d", title: "#dcfce7", text: "#bbf7d0" },
  { name: "Lila",     bg: "#4c1d95", title: "#ede9fe", text: "#ddd6fe" },
  { name: "Warmgrau", bg: "#1c1917", title: "#fafaf9", text: "#a8a29e" },
  { name: "Rose",     bg: "#881337", title: "#ffe4e6", text: "#fecdd3" },
];

const FONTS = ["Arial", "Times New Roman", "Georgia", "Calibri", "Helvetica", "Courier New", "Trebuchet MS", "Verdana"];

function makeElement(type: ElType, bg: string): SlideElement {
  const isDark = bg !== "#ffffff" && bg !== "#f8fafc";
  const baseColor = isDark ? "#ffffff" : "#1a1a1a";
  const defaults: Record<ElType, Partial<SlideElement>> = {
    title:    { x: 10, y: 25, w: 80, h: 18, content: "Folientitel", fontSize: 40, bold: true, align: "center", color: baseColor },
    subtitle: { x: 15, y: 48, w: 70, h: 14, content: "Untertitel eingeben", fontSize: 22, bold: false, align: "center", color: isDark ? "#9ca3af" : "#4b5563" },
    text:     { x: 15, y: 20, w: 70, h: 20, content: "Textfeld bearbeiten", fontSize: 18, bold: false, align: "left", color: baseColor },
    image:    { x: 25, y: 20, w: 50, h: 40, content: "", fontSize: 14, bold: false, align: "center", color: "#6b7280" },
    shape:    { x: 30, y: 30, w: 40, h: 25, content: "", fontSize: 14, bold: false, align: "center", color: "#ffffff", bg: "#2FC5E7", shapeType: "rect" },
  };
  return {
    id: nanoid(), type, fontFamily: "Arial", italic: false, underline: false, bg: "transparent", opacity: 1,
    ...{ fontSize: 18, bold: false, align: "center" as Align, color: "#000000", x: 10, y: 30, w: 80, h: 20, content: "" },
    ...defaults[type],
  } as SlideElement;
}

function makeSlide(themeIdx = 0): Slide {
  const theme = THEMES[themeIdx];
  return {
    id: nanoid(),
    background: theme.bg,
    notes: "",
    elements: [
      { ...makeElement("title", theme.bg), color: theme.title },
      { ...makeElement("subtitle", theme.bg), color: theme.text },
    ],
  };
}

function parseSlides(json: string): Slide[] {
  try {
    const arr = JSON.parse(json) as Slide[];
    if (!Array.isArray(arr) || arr.length === 0) return [makeSlide()];
    // Migrate old format
    return arr.map((s) => ({
      ...s,
      notes: s.notes ?? "",
      elements: s.elements.map((el) => ({
        ...el,
        fontFamily: el.fontFamily ?? "Arial",
        italic: el.italic ?? false,
        underline: el.underline ?? false,
        bg: el.bg ?? "transparent",
        opacity: el.opacity ?? 1,
      })),
    }));
  } catch { return [makeSlide()]; }
}

// ── Slide thumbnail ────────────────────────────────────────────────────────

function SlideThumbnail({ slide, index, active, onClick }: {
  slide: Slide; index: number; active: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`group relative flex w-full flex-col gap-1 p-2 text-left transition-colors ${active ? "bg-brand/10" : "hover:bg-surface"}`}>
      <div className="relative w-full overflow-hidden rounded border border-gray-200"
        style={{ aspectRatio: "16/9", backgroundColor: slide.background }}>
        {slide.elements.map((el) => (
          <div key={el.id} className="absolute overflow-hidden"
            style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, minHeight: `${el.h}%` }}>
            {el.type === "image" && el.content ? (
              <img src={el.content} alt="" className="h-full w-full object-cover" />
            ) : (
              <p style={{
                fontSize: `${el.fontSize * 0.11}px`, color: el.color, fontWeight: el.bold ? "bold" : "normal",
                fontStyle: el.italic ? "italic" : "normal", textAlign: el.align, lineHeight: 1.2, whiteSpace: "pre-wrap",
              }}>{el.content}</p>
            )}
          </div>
        ))}
        {active && <div className="absolute inset-0 ring-2 ring-brand ring-inset" />}
      </div>
      <span className="text-[10px] text-muted-fg">{index + 1}</span>
    </button>
  );
}

// ── Slide canvas with drag + resize ───────────────────────────────────────

interface CanvasProps {
  slide: Slide;
  onUpdate: (slide: Slide) => void;
  presenting: boolean;
}

function SlideCanvas({ slide, onUpdate, presenting }: CanvasProps) {
  const [selId, setSelId]       = useState<string | null>(null);
  const [editId, setEditId]     = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; handle: string; ox: number; oy: number; ow: number; oh: number; ex: number; ey: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const el = slide.elements.find((e) => e.id === selId);

  function upEl(id: string, patch: Partial<SlideElement>) {
    onUpdate({ ...slide, elements: slide.elements.map((e) => e.id === id ? { ...e, ...patch } : e) });
  }
  function delEl(id: string) {
    onUpdate({ ...slide, elements: slide.elements.filter((e) => e.id !== id) });
    setSelId(null); setEditId(null);
  }

  // Drag
  function onPtrDown(e: React.PointerEvent, id: string) {
    if (presenting || editId === id) return;
    e.preventDefault(); e.stopPropagation();
    const el = slide.elements.find((x) => x.id === id);
    if (!el) return;
    setSelId(id);
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ox = e.clientX - rect.left - (el.x / 100) * rect.width;
    const oy = e.clientY - rect.top  - (el.y / 100) * rect.height;
    setDragging({ id, ox, oy });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPtrMove(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (dragging) {
      const x = Math.max(0, Math.min(90, ((e.clientX - rect.left - dragging.ox) / rect.width) * 100));
      const y = Math.max(0, Math.min(90, ((e.clientY - rect.top  - dragging.oy) / rect.height) * 100));
      const cur = slide.elements.find((x) => x.id === dragging.id);
      if (cur) upEl(dragging.id, { x, y });
    }
    if (resizing) {
      const { id, handle, ox, oy, ow, oh, ex, ey } = resizing;
      const dx = ((e.clientX - ox) / rect.width)  * 100;
      const dy = ((e.clientY - oy) / rect.height) * 100;
      const cur = slide.elements.find((x) => x.id === id);
      if (!cur) return;
      let nx = ex, ny = ey, nw = ow, nh = oh;
      if (handle.includes("e")) nw = Math.max(5, ow + dx);
      if (handle.includes("s")) nh = Math.max(5, oh + dy);
      if (handle.includes("w")) { nx = ex + dx; nw = Math.max(5, ow - dx); }
      if (handle.includes("n")) { ny = ey + dy; nh = Math.max(5, oh - dy); }
      upEl(id, { x: nx, y: ny, w: nw, h: nh });
    }
  }

  function onPtrUp() { setDragging(null); setResizing(null); }

  function startResize(e: React.PointerEvent, id: string, handle: string) {
    e.preventDefault(); e.stopPropagation();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cur = slide.elements.find((x) => x.id === id);
    if (!cur) return;
    setResizing({ id, handle, ox: e.clientX, oy: e.clientY, ow: cur.w, oh: cur.h, ex: cur.x, ey: cur.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  const HANDLES = [
    { id: "nw", style: { top: -5, left: -5, cursor: "nw-resize" } },
    { id: "n",  style: { top: -5, left: "calc(50% - 5px)", cursor: "n-resize" } },
    { id: "ne", style: { top: -5, right: -5, cursor: "ne-resize" } },
    { id: "e",  style: { top: "calc(50% - 5px)", right: -5, cursor: "e-resize" } },
    { id: "se", style: { bottom: -5, right: -5, cursor: "se-resize" } },
    { id: "s",  style: { bottom: -5, left: "calc(50% - 5px)", cursor: "s-resize" } },
    { id: "sw", style: { bottom: -5, left: -5, cursor: "sw-resize" } },
    { id: "w",  style: { top: "calc(50% - 5px)", left: -5, cursor: "w-resize" } },
  ];

  return (
    <div
      className="flex flex-1 items-center justify-center overflow-hidden bg-[#404040] select-none"
      onPointerMove={onPtrMove}
      onPointerUp={onPtrUp}
    >
      <div
        ref={canvasRef}
        className="relative shadow-2xl"
        style={{
          backgroundColor: slide.background,
          aspectRatio: "16/9",
          maxWidth: "100%",
          maxHeight: "100%",
          width: "min(100%, calc((100vh - 12rem) * 16 / 9))",
        }}
        onClick={(e) => { if (e.target === canvasRef.current) { setSelId(null); setEditId(null); } }}
      >
        {slide.elements.map((elem) => {
          const isSel  = selId === elem.id;
          const isEdit = editId === elem.id;
          return (
            <div
              key={elem.id}
              className="absolute"
              style={{
                left: `${elem.x}%`, top: `${elem.y}%`,
                width: `${elem.w}%`, minHeight: `${elem.h}%`,
                cursor: presenting ? "default" : (isEdit ? "text" : "move"),
                outline: !presenting && isSel ? "2px solid #14b8a6" : "none",
                outlineOffset: 2,
                userSelect: isEdit ? "text" : "none",
                backgroundColor: elem.bg !== "transparent" ? elem.bg : undefined,
                opacity: elem.opacity,
              }}
              onPointerDown={(e) => onPtrDown(e, elem.id)}
              onClick={(e) => { e.stopPropagation(); setSelId(elem.id); }}
              onDoubleClick={(e) => { e.stopPropagation(); setSelId(elem.id); setEditId(elem.id); setDragging(null); }}
            >
              {/* Resize handles */}
              {isSel && !presenting && !isEdit && HANDLES.map((h) => (
                <div
                  key={h.id}
                  className="absolute size-2.5 rounded-full border-2 border-brand bg-white"
                  style={{ ...h.style, position: "absolute" }}
                  onPointerDown={(e) => startResize(e, elem.id, h.id)}
                />
              ))}

              {elem.type === "shape" ? (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{
                    backgroundColor: elem.bg !== "transparent" ? elem.bg : "#2FC5E7",
                    borderRadius: elem.shapeType === "circle" ? "50%" : "8px",
                    clipPath: elem.shapeType === "triangle" ? "polygon(50% 0%,0% 100%,100% 100%)" : undefined,
                    minHeight: `${elem.h}%`,
                  }}
                >
                  {elem.content && (
                    <span style={{ color: elem.color, fontSize: `${elem.fontSize * 0.013}vw`, fontWeight: elem.bold ? "bold" : "normal" }}>
                      {elem.content}
                    </span>
                  )}
                </div>
              ) : elem.type === "image" ? (
                elem.content ? (
                  <img src={elem.content} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <label className="flex h-full min-h-24 w-full cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand hover:text-brand">
                    <Image className="size-8" strokeWidth={1.5} />
                    <span className="mt-1 text-xs">Bild einfügen</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => upEl(elem.id, { content: ev.target?.result as string });
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }} />
                  </label>
                )
              ) : isEdit && !presenting ? (
                <textarea
                  autoFocus
                  value={elem.content}
                  onChange={(e) => upEl(elem.id, { content: e.target.value })}
                  onBlur={() => setEditId(null)}
                  onKeyDown={(e) => { if (e.key === "Escape") setEditId(null); }}
                  className="h-full w-full resize-none border-0 bg-transparent focus:outline-none"
                  style={{
                    fontSize: `${elem.fontSize}px`, color: elem.color, fontWeight: elem.bold ? "bold" : "normal",
                    fontStyle: elem.italic ? "italic" : "normal", textDecoration: elem.underline ? "underline" : "none",
                    fontFamily: elem.fontFamily, textAlign: elem.align, lineHeight: 1.3,
                  }}
                />
              ) : (
                <p style={{
                  fontSize: `${elem.fontSize}px`, color: elem.color, fontWeight: elem.bold ? "bold" : "normal",
                  fontStyle: elem.italic ? "italic" : "normal", textDecoration: elem.underline ? "underline" : "none",
                  fontFamily: elem.fontFamily, textAlign: elem.align, lineHeight: 1.3, whiteSpace: "pre-wrap",
                }}>
                  {elem.content || (presenting ? "" : <span style={{ opacity: 0.3 }}>Doppelklick zum Bearbeiten</span>)}
                </p>
              )}

              {/* Element delete button */}
              {isSel && !presenting && !isEdit && (
                <button type="button"
                  onPointerDown={(e) => { e.stopPropagation(); delEl(elem.id); }}
                  className="absolute -right-7 -top-1 grid size-5 place-items-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  style={{ fontSize: 10 }}>✕</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Format bar (floats over canvas when element selected) */}
      {el && !presenting && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1 shadow-xl">
          {/* Font */}
          <select value={el.fontFamily} onChange={(e) => upEl(el.id, { fontFamily: e.target.value })}
            className="h-6 rounded border border-gray-200 bg-white text-[10px] text-gray-700 focus:outline-none">
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          {/* Size */}
          <select value={el.fontSize} onChange={(e) => upEl(el.id, { fontSize: Number(e.target.value) })}
            className="h-6 w-14 rounded border border-gray-200 bg-white text-[10px] text-gray-700 focus:outline-none">
            {[10,12,14,16,18,20,24,28,32,36,40,48,56,64,72,96].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="h-4 w-px bg-gray-200" />
          {/* B I U */}
          {[
            { icon: <Bold className="size-3" />, key: "bold" as const, val: el.bold },
            { icon: <Italic className="size-3" />, key: "italic" as const, val: el.italic },
            { icon: <Underline className="size-3" />, key: "underline" as const, val: el.underline },
          ].map(({ icon, key, val }) => (
            <button key={key} type="button" onClick={() => upEl(el.id, { [key]: val! })}
              className={`grid size-6 place-items-center rounded transition-colors ${val ? "bg-brand/15 text-brand" : "text-gray-600 hover:bg-gray-100"}`}>
              {icon}
            </button>
          ))}
          <div className="h-4 w-px bg-gray-200" />
          {/* Align */}
          {([["left", <AlignLeft className="size-3" />], ["center", <AlignCenter className="size-3" />], ["right", <AlignRight className="size-3" />]] as const).map(([a, icon]) => (
            <button key={a} type="button" onClick={() => upEl(el.id, { align: a })}
              className={`grid size-6 place-items-center rounded transition-colors ${el.align === a ? "bg-brand/15 text-brand" : "text-gray-600 hover:bg-gray-100"}`}>
              {icon}
            </button>
          ))}
          <div className="h-4 w-px bg-gray-200" />
          {/* Text color */}
          <input type="color" value={el.color} onChange={(e) => upEl(el.id, { color: e.target.value })}
            className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" title="Textfarbe" />
          {/* BG color */}
          <input type="color" value={el.bg === "transparent" ? "#ffffff" : el.bg}
            onChange={(e) => upEl(el.id, { bg: e.target.value })}
            className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" title="Hintergrund" />
          {/* Shape type selector */}
          {el.type === "shape" && (
            <>
              <div className="h-4 w-px bg-gray-200" />
              <select value={el.shapeType ?? "rect"} onChange={(e) => upEl(el.id, { shapeType: e.target.value as ShapeType })}
                className="h-6 rounded border border-gray-200 bg-white text-[10px] text-gray-700 focus:outline-none">
                <option value="rect">Rechteck</option>
                <option value="circle">Kreis</option>
                <option value="triangle">Dreieck</option>
              </select>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────

interface Props { presentationId: string; initialTitle: string; initialSlides: string; }

export function PresentationEditor({ presentationId, initialTitle, initialSlides }: Props) {
  const [slides, setSlides] = useState<Slide[]>(() => parseSlides(initialSlides));
  const [curIdx, setCurIdx] = useState(0);
  const [title, setTitle]   = useState(initialTitle);
  const [editTitle, setEditTitle] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [showNotes, setShowNotes]   = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [, startTr] = useTransition();
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);

  const current = slides[Math.min(curIdx, slides.length - 1)] ?? slides[0];

  const triggerSave = useCallback((next: Slide[]) => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saving");
      startTr(async () => { await savePresentationSlides(presentationId, JSON.stringify(next)); setSaveStatus("saved"); });
    }, 800);
  }, [presentationId]);

  function updateSlide(updated: Slide) {
    setSlides((prev) => { const next = prev.map((s) => s.id === updated.id ? updated : s); triggerSave(next); return next; });
  }

  function addSlide(themeIdx?: number) {
    const ns = makeSlide(themeIdx);
    setSlides((prev) => { const next = [...prev.slice(0, curIdx + 1), ns, ...prev.slice(curIdx + 1)]; triggerSave(next); return next; });
    setCurIdx(curIdx + 1);
  }

  function dupSlide() {
    const ns: Slide = { ...current, id: nanoid(), elements: current.elements.map((e) => ({ ...e, id: nanoid() })) };
    setSlides((prev) => { const next = [...prev.slice(0, curIdx + 1), ns, ...prev.slice(curIdx + 1)]; triggerSave(next); return next; });
    setCurIdx(curIdx + 1);
  }

  function delSlide() {
    if (slides.length <= 1) return;
    if (!confirm("Folie löschen?")) return;
    setSlides((prev) => { const next = prev.filter((_, i) => i !== curIdx); triggerSave(next); return next; });
    setCurIdx(Math.max(0, curIdx - 1));
  }

  function addElement(type: ElType) {
    const el = makeElement(type, current.background);
    updateSlide({ ...current, elements: [...current.elements, el] });
  }

  function commitTitle() {
    const val = title.trim() || "Unbenannte Präsentation";
    setTitle(val); setEditTitle(false);
    if (val !== initialTitle) startTr(() => renamePresentation(presentationId, val));
  }

  function handleDelete() {
    if (!confirm(`Präsentation "${title}" wirklich löschen?`)) return;
    startTr(() => deletePresentation(presentationId));
  }

  function togglePresent() {
    if (!presenting) {
      wrapRef.current?.requestFullscreen?.().catch(() => {});
      setPresenting(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setPresenting(false);
    }
  }

  // Fullscreen exit listener
  useEffect(() => {
    const h = () => { if (!document.fullscreenElement) setPresenting(false); };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ── Presentation mode ─────────────────────────────────────────────────────

  if (presenting) {
    const transAnim = current.transition === "fade"  ? "presenterFade 0.4s ease"  :
                      current.transition === "zoom"  ? "presenterZoom 0.4s ease"  :
                      current.transition === "slide" ? "presenterSlide 0.4s ease" : "none";
    return (
      <div ref={wrapRef} className="fixed inset-0 z-9999 flex flex-col bg-black"
        onKeyDown={(e) => {
          if (e.key === "Escape")                              togglePresent();
          if (e.key === "ArrowRight" || e.key === "ArrowDown") setCurIdx((i) => Math.min(i + 1, slides.length - 1));
          if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   setCurIdx((i) => Math.max(0, i - 1));
        }}
        tabIndex={0} autoFocus>
        <style>{`
          @keyframes presenterFade  { from { opacity:0 } to { opacity:1 } }
          @keyframes presenterZoom  { from { opacity:0;transform:scale(0.92) } to { opacity:1;transform:scale(1) } }
          @keyframes presenterSlide { from { opacity:0;transform:translateX(40px) } to { opacity:1;transform:translateX(0) } }
        `}</style>
        <div key={`slide-${curIdx}`} className="flex flex-1 items-center justify-center overflow-hidden"
          style={{ backgroundColor: current.background, animation: transAnim }}>
          <SlideCanvas slide={current} onUpdate={updateSlide} presenting />
        </div>
        {current.notes && (
          <div className="shrink-0 border-t border-white/10 bg-black/80 px-8 py-2 text-sm text-white/60">{current.notes}</div>
        )}
        <div className="absolute bottom-4 right-4 flex items-center gap-3">
          <span className="font-mono text-xs text-white/40">{curIdx + 1} / {slides.length}</span>
          <button type="button" onClick={() => setCurIdx((i) => Math.max(0, i - 1))} disabled={curIdx === 0} className="grid size-8 place-items-center text-white/60 hover:text-white disabled:opacity-20"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={() => setCurIdx((i) => Math.min(i + 1, slides.length - 1))} disabled={curIdx === slides.length - 1} className="grid size-8 place-items-center text-white/60 hover:text-white disabled:opacity-20"><ChevronRight className="size-5" /></button>
          <button type="button" onClick={togglePresent} className="grid size-8 place-items-center text-white/60 hover:text-white"><Minimize2 className="size-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="-mx-6 -mb-24 -mt-8 flex h-[calc(100vh-4rem)] flex-col overflow-hidden lg:-mx-10 lg:-mb-10 lg:-mt-10">

      {/* ── Title bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-1.5 shadow-sm">
        <Link href="/app/praesentationen" className="grid size-8 place-items-center text-gray-400 hover:text-gray-700">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          {editTitle ? (
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitle(initialTitle); setEditTitle(false); } }}
              className="w-full border-b border-brand bg-transparent text-sm font-semibold focus:outline-none" />
          ) : (
            <button type="button" onClick={() => setEditTitle(true)} className="truncate text-sm font-semibold hover:text-brand">{title}</button>
          )}
        </div>
        <span className="font-mono text-[10px] text-gray-400">
          {saveStatus === "saving" ? "Speichert…" : saveStatus === "unsaved" ? "●" : "✓"}
        </span>
        <button type="button" onClick={() => setShowNotes((v) => !v)}
          className={`rounded border px-2 py-1 text-[11px] font-medium transition-colors ${showNotes ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
          Notizen
        </button>
        <div className="relative">
          <button type="button" onClick={() => setShowThemes((v) => !v)}
            className="rounded border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50">
            Design
          </button>
          {showThemes && (
            <div className="absolute top-full right-0 z-50 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Design wählen</p>
              <div className="grid grid-cols-4 gap-1.5">
                {THEMES.map((t, i) => (
                  <button key={t.name} type="button"
                    onClick={() => { updateSlide({ ...current, background: t.bg }); setShowThemes(false); }}
                    className="group flex flex-col items-center gap-1 rounded-lg p-1 hover:bg-gray-50" title={t.name}>
                    <div className="size-8 rounded border border-gray-200" style={{ backgroundColor: t.bg }} />
                    <span className="text-[9px] text-gray-500">{t.name}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-gray-400">Benutzerdefiniert:</span>
                <input type="color" value={current.background} onChange={(e) => updateSlide({ ...current, background: e.target.value })}
                  className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" />
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Folienübergang</p>
                <div className="flex flex-col gap-1">
                  {TRANSITIONS.map((t) => (
                    <button key={t.value} type="button"
                      onClick={() => updateSlide({ ...current, transition: t.value })}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] text-left transition-colors ${current.transition === t.value || (!current.transition && t.value === "none") ? "bg-brand/10 text-brand font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={togglePresent}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90">
          <Maximize2 className="size-3.5" strokeWidth={2} /> Präsentieren
        </button>
        <button type="button" onClick={handleDelete} className="grid size-7 place-items-center rounded border border-gray-200 text-gray-500 hover:text-red-500">
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* ── Insert toolbar ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-3 py-1">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Einfügen:</span>
        <button type="button" onClick={() => addElement("text")}
          className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
          <Type className="size-3" strokeWidth={2} /> Textfeld
        </button>
        <button type="button" onClick={() => addElement("title")}
          className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
          <Type className="size-3.5 font-bold" strokeWidth={2.5} /> Titel
        </button>
        <button type="button" onClick={() => addElement("image")}
          className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
          <Image className="size-3" strokeWidth={2} /> Bild
        </button>
        <button type="button" onClick={() => addElement("shape")}
          className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
          <span className="size-3 rounded-sm bg-brand/40" /> Form
        </button>
      </div>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Slide panel */}
        <aside className="flex w-44 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between border-b border-gray-200 px-2 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Folien ({slides.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {slides.map((s, i) => (
              <SlideThumbnail key={s.id} slide={s} index={i} active={i === curIdx} onClick={() => setCurIdx(i)} />
            ))}
          </div>
          <div className="flex items-center gap-1 border-t border-gray-200 p-2">
            <button type="button" onClick={() => addSlide()} title="Neue Folie"
              className="flex flex-1 items-center justify-center gap-1 rounded border border-gray-200 bg-white py-1.5 text-[11px] text-gray-500 hover:border-brand hover:text-brand">
              <Plus className="size-3" strokeWidth={2} /> Folie
            </button>
            <button type="button" onClick={dupSlide} title="Duplizieren"
              className="grid size-7 place-items-center rounded border border-gray-200 bg-white text-gray-400 hover:text-brand">
              <Copy className="size-3" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={delSlide} disabled={slides.length <= 1} title="Löschen"
              className="grid size-7 place-items-center rounded border border-gray-200 bg-white text-gray-400 hover:text-red-500 disabled:opacity-30">
              <Trash2 className="size-3" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 px-2 py-1">
            <button type="button" onClick={() => setCurIdx((i) => Math.max(0, i - 1))} disabled={curIdx === 0}
              className="grid size-6 place-items-center text-gray-400 disabled:opacity-30 hover:text-gray-700">
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-mono text-[10px] text-gray-400">{curIdx + 1} / {slides.length}</span>
            <button type="button" onClick={() => setCurIdx((i) => Math.min(i + 1, slides.length - 1))} disabled={curIdx === slides.length - 1}
              className="grid size-6 place-items-center text-gray-400 disabled:opacity-30 hover:text-gray-700">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </aside>

        {/* Canvas + notes */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="relative flex-1 overflow-hidden">
            <SlideCanvas slide={current} onUpdate={updateSlide} presenting={false} />
          </div>

          {/* Speaker notes */}
          {showNotes && (
            <div className="shrink-0 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Sprechernotizen</span>
              </div>
              <textarea
                value={current.notes}
                onChange={(e) => updateSlide({ ...current, notes: e.target.value })}
                placeholder="Notizen für Folie eingeben…"
                rows={3}
                className="w-full resize-none border-0 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none placeholder:text-gray-300"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
