"use client";

import {
  useCallback,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import Link from "next/link";
import { nanoid } from "@/lib/utils";
import { savePresentationSlides, renamePresentation, deletePresentation } from "../actions";

// ── Types ─────────────────────────────────────────────────────────────────

type ElementType = "text" | "title" | "subtitle";

interface SlideElement {
  id: string;
  type: ElementType;
  x: number;    // % of slide width
  y: number;    // % of slide height
  w: number;
  h: number;
  content: string;
  fontSize: number;
  color: string;
  bold: boolean;
  align: "left" | "center" | "right";
}

interface Slide {
  id: string;
  background: string;
  elements: SlideElement[];
}

const SLIDE_TEMPLATES: Slide[] = [
  {
    id: "",
    background: "#ffffff",
    elements: [
      { id: "", type: "title", x: 10, y: 30, w: 80, h: 20, content: "Folientitel", fontSize: 36, color: "#1a1a1a", bold: true, align: "center" },
      { id: "", type: "subtitle", x: 10, y: 55, w: 80, h: 15, content: "Untertitel eingeben", fontSize: 20, color: "#555555", bold: false, align: "center" },
    ],
  },
];

function makeSlide(): Slide {
  const tpl = SLIDE_TEMPLATES[0];
  return {
    id: nanoid(),
    background: tpl.background,
    elements: tpl.elements.map((el) => ({ ...el, id: nanoid() })),
  };
}

function parseSlides(json: string): Slide[] {
  try {
    const arr = JSON.parse(json) as Slide[];
    if (!Array.isArray(arr) || arr.length === 0) return [makeSlide()];
    return arr;
  } catch {
    return [makeSlide()];
  }
}

// ── Background presets ────────────────────────────────────────────────────

const BG_PRESETS = [
  "#ffffff", "#f8fafc", "#1e293b", "#0f172a",
  "#1d4ed8", "#7c3aed", "#059669", "#dc2626",
  "#f59e0b", "#ec4899",
];

// ── Slide canvas ──────────────────────────────────────────────────────────

interface SlideCanvasProps {
  slide: Slide;
  onUpdate: (slide: Slide) => void;
  isPresenting: boolean;
}

function SlideCanvas({ slide, onUpdate, isPresenting }: SlideCanvasProps) {
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  const [editingEl, setEditingEl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  function updateElement(id: string, patch: Partial<SlideElement>) {
    onUpdate({
      ...slide,
      elements: slide.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    });
  }

  function deleteElement(id: string) {
    onUpdate({ ...slide, elements: slide.elements.filter((el) => el.id !== id) });
    setSelectedEl(null);
    setEditingEl(null);
  }

  function addTextElement() {
    const el: SlideElement = {
      id: nanoid(),
      type: "text",
      x: 20, y: 40, w: 60, h: 15,
      content: "Textfeld",
      fontSize: 18,
      color: slide.background === "#ffffff" || slide.background === "#f8fafc" ? "#1a1a1a" : "#ffffff",
      bold: false,
      align: "left",
    };
    onUpdate({ ...slide, elements: [...slide.elements, el] });
    setSelectedEl(el.id);
  }

  const isDark = ["#1e293b", "#0f172a", "#1d4ed8", "#7c3aed", "#059669", "#dc2626"].includes(slide.background);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {!isPresenting && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg px-4 py-2">
          <button
            type="button"
            onClick={addTextElement}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-surface-2"
          >
            <Type className="size-3.5" strokeWidth={2} />
            Textfeld
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Hintergrund:</span>
            {BG_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onUpdate({ ...slide, background: color })}
                className="size-5 rounded-full border border-border transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <input
              type="color"
              value={slide.background}
              onChange={(e) => onUpdate({ ...slide, background: e.target.value })}
              className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
              title="Benutzerdefinierte Farbe"
            />
          </div>

          {selectedEl && (
            <>
              <div className="h-5 w-px bg-border mx-2" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Schrift:</span>
              {[14, 18, 24, 32, 48].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateElement(selectedEl, { fontSize: size })}
                  className="rounded border border-border px-2 py-0.5 text-[10px] font-mono hover:bg-surface-2"
                >
                  {size}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const el = slide.elements.find((e) => e.id === selectedEl);
                  if (el) updateElement(selectedEl, { bold: !el.bold });
                }}
                className="rounded border border-border px-2 py-0.5 text-[10px] font-bold hover:bg-surface-2"
              >
                B
              </button>
              <input
                type="color"
                defaultValue={slide.elements.find((e) => e.id === selectedEl)?.color ?? "#000000"}
                onChange={(e) => updateElement(selectedEl, { color: e.target.value })}
                className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Textfarbe"
              />
              <button
                type="button"
                onClick={() => deleteElement(selectedEl)}
                className="ml-auto grid size-6 place-items-center text-muted-fg hover:text-danger"
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Slide canvas — 16:9 */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-[#404040] p-4">
        <div
          ref={canvasRef}
          className="relative shadow-2xl"
          style={{
            backgroundColor: slide.background,
            aspectRatio: "16/9",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "min(100%, calc(100vh * 16/9 - 8rem))",
          }}
          onClick={(e) => {
            if (e.target === canvasRef.current) {
              setSelectedEl(null);
              setEditingEl(null);
            }
          }}
        >
          {slide.elements.map((el) => {
            const isSelected = selectedEl === el.id;
            const isEditing = editingEl === el.id;
            return (
              <div
                key={el.id}
                className={`absolute select-none ${!isPresenting ? "cursor-move" : ""}`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.w}%`,
                  minHeight: `${el.h}%`,
                  outline: !isPresenting && isSelected ? "2px solid #6366f1" : "none",
                  outlineOffset: 2,
                }}
                onClick={(e) => { e.stopPropagation(); setSelectedEl(el.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); setSelectedEl(el.id); setEditingEl(el.id); }}
              >
                {isEditing && !isPresenting ? (
                  <textarea
                    autoFocus
                    value={el.content}
                    onChange={(e) => updateElement(el.id, { content: e.target.value })}
                    onBlur={() => setEditingEl(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingEl(null);
                    }}
                    className="h-full w-full resize-none border-0 bg-transparent focus:outline-none"
                    style={{
                      fontSize: `${el.fontSize}px`,
                      color: el.color,
                      fontWeight: el.bold ? "bold" : "normal",
                      textAlign: el.align,
                      lineHeight: 1.3,
                    }}
                  />
                ) : (
                  <p
                    style={{
                      fontSize: `${el.fontSize}px`,
                      color: el.color,
                      fontWeight: el.bold ? "bold" : "normal",
                      textAlign: el.align,
                      lineHeight: 1.3,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {el.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Thumbnail ─────────────────────────────────────────────────────────────

function SlideThumbnail({ slide, index, isActive, onClick }: {
  slide: Slide;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full flex-col gap-1.5 p-2 text-left transition-colors ${isActive ? "bg-brand/10" : "hover:bg-surface"}`}
    >
      <div
        className="relative w-full overflow-hidden rounded border border-border"
        style={{ aspectRatio: "16/9", backgroundColor: slide.background }}
      >
        {slide.elements.map((el) => (
          <div
            key={el.id}
            className="absolute overflow-hidden"
            style={{
              left: `${el.x}%`, top: `${el.y}%`,
              width: `${el.w}%`, minHeight: `${el.h}%`,
            }}
          >
            <p
              style={{
                fontSize: `${el.fontSize * 0.12}px`,
                color: el.color,
                fontWeight: el.bold ? "bold" : "normal",
                textAlign: el.align,
                lineHeight: 1.3,
                whiteSpace: "pre-wrap",
              }}
            >
              {el.content}
            </p>
          </div>
        ))}
        {isActive && <div className="absolute inset-0 ring-2 ring-brand ring-inset" />}
      </div>
      <span className="text-[10px] text-muted-fg">{index + 1}</span>
    </button>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────

interface Props {
  presentationId: string;
  initialTitle: string;
  initialSlides: string;
}

export function PresentationEditor({ presentationId, initialTitle, initialSlides }: Props) {
  const [slides, setSlides] = useState<Slide[]>(() => parseSlides(initialSlides));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const current = slides[Math.min(currentIdx, slides.length - 1)] ?? slides[0];

  const triggerSave = useCallback((next: Slide[]) => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saving");
      startTransition(async () => {
        await savePresentationSlides(presentationId, JSON.stringify(next));
        setSaveStatus("saved");
      });
    }, 800);
  }, [presentationId]);

  function updateSlide(updated: Slide) {
    setSlides((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      triggerSave(next);
      return next;
    });
  }

  function addSlide() {
    const newSlide = makeSlide();
    setSlides((prev) => {
      const next = [...prev.slice(0, currentIdx + 1), newSlide, ...prev.slice(currentIdx + 1)];
      triggerSave(next);
      return next;
    });
    setCurrentIdx(currentIdx + 1);
  }

  function duplicateSlide() {
    const newSlide: Slide = {
      ...current,
      id: nanoid(),
      elements: current.elements.map((el) => ({ ...el, id: nanoid() })),
    };
    setSlides((prev) => {
      const next = [...prev.slice(0, currentIdx + 1), newSlide, ...prev.slice(currentIdx + 1)];
      triggerSave(next);
      return next;
    });
    setCurrentIdx(currentIdx + 1);
  }

  function deleteSlide() {
    if (slides.length <= 1) return;
    if (!confirm("Folie löschen?")) return;
    setSlides((prev) => {
      const next = prev.filter((_, i) => i !== currentIdx);
      triggerSave(next);
      return next;
    });
    setCurrentIdx(Math.max(0, currentIdx - 1));
  }

  function commitTitle() {
    const val = title.trim() || "Unbenannte Präsentation";
    setTitle(val);
    setEditingTitle(false);
    if (val !== initialTitle) startTransition(() => renamePresentation(presentationId, val));
  }

  function handleDelete() {
    if (!confirm(`Präsentation "${title}" wirklich löschen?`)) return;
    startTransition(() => deletePresentation(presentationId));
  }

  function togglePresent() {
    if (!presenting) {
      wrapperRef.current?.requestFullscreen?.().catch(() => {});
      setPresenting(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setPresenting(false);
    }
  }

  if (presenting) {
    return (
      <div
        ref={wrapperRef}
        className="fixed inset-0 z-[9999] flex flex-col bg-black"
        onKeyDown={(e) => {
          if (e.key === "Escape") { setPresenting(false); }
          if (e.key === "ArrowRight" || e.key === "ArrowDown") setCurrentIdx((i) => Math.min(i + 1, slides.length - 1));
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") setCurrentIdx((i) => Math.max(0, i - 1));
        }}
        tabIndex={0}
        autoFocus
      >
        <SlideCanvas slide={current} onUpdate={updateSlide} isPresenting />
        <div className="absolute bottom-4 right-4 flex items-center gap-3">
          <span className="font-mono text-xs text-white/60">{currentIdx + 1} / {slides.length}</span>
          <button type="button" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0} className="grid size-8 place-items-center text-white/60 hover:text-white disabled:opacity-30">
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>
          <button type="button" onClick={() => setCurrentIdx((i) => Math.min(i + 1, slides.length - 1))} disabled={currentIdx === slides.length - 1} className="grid size-8 place-items-center text-white/60 hover:text-white disabled:opacity-30">
            <ChevronRight className="size-5" strokeWidth={1.75} />
          </button>
          <button type="button" onClick={togglePresent} className="grid size-8 place-items-center text-white/60 hover:text-white">
            <Minimize2 className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="-mx-6 -mb-24 -mt-8 flex h-[calc(100vh-4rem)] flex-col overflow-hidden lg:-mx-10 lg:-mb-10 lg:-mt-10"
    >
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg px-4 py-2">
        <Link href="/app/praesentationen" className="grid size-8 place-items-center text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>

        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") { setTitle(initialTitle); setEditingTitle(false); }
              }}
              className="w-full border-b border-brand bg-transparent text-sm font-semibold focus:outline-none"
            />
          ) : (
            <button type="button" onClick={() => setEditingTitle(true)} className="truncate text-sm font-semibold hover:text-brand">
              {title}
            </button>
          )}
        </div>

        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
          {saveStatus === "saving" ? "Speichert…" : saveStatus === "unsaved" ? "Ungespeichert" : "Gespeichert ✓"}
        </span>

        <button type="button" onClick={togglePresent} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg hover:bg-brand/90">
          <Maximize2 className="size-3.5" strokeWidth={2} />
          Präsentieren
        </button>
        <button type="button" onClick={handleDelete} className="grid size-8 place-items-center border border-border text-muted-fg hover:text-danger">
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Slide panel */}
        <aside className="flex w-44 shrink-0 flex-col border-r border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-2 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Folien ({slides.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {slides.map((slide, i) => (
              <SlideThumbnail
                key={slide.id}
                slide={slide}
                index={i}
                isActive={i === currentIdx}
                onClick={() => setCurrentIdx(i)}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 border-t border-border p-2">
            <button type="button" onClick={addSlide} title="Folie hinzufügen" className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-bg py-1.5 text-[11px] text-muted-fg transition-colors hover:border-brand hover:text-brand">
              <Plus className="size-3" strokeWidth={2} /> Folie
            </button>
            <button type="button" onClick={duplicateSlide} title="Folie duplizieren" className="grid size-7 place-items-center rounded-lg border border-border bg-bg text-muted-fg hover:text-brand">
              <Copy className="size-3" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={deleteSlide} disabled={slides.length <= 1} title="Folie löschen" className="grid size-7 place-items-center rounded-lg border border-border bg-bg text-muted-fg hover:text-danger disabled:opacity-30">
              <Trash2 className="size-3" strokeWidth={1.75} />
            </button>
          </div>
          {/* Slide navigation arrows */}
          <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
            <button type="button" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0} className="grid size-6 place-items-center text-muted-fg disabled:opacity-30 hover:text-fg">
              <ChevronLeft className="size-4" strokeWidth={1.75} />
            </button>
            <span className="font-mono text-[10px] text-muted-fg">{currentIdx + 1} / {slides.length}</span>
            <button type="button" onClick={() => setCurrentIdx((i) => Math.min(i + 1, slides.length - 1))} disabled={currentIdx === slides.length - 1} className="grid size-6 place-items-center text-muted-fg disabled:opacity-30 hover:text-fg">
              <ChevronRight className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </aside>

        {/* Canvas area */}
        <SlideCanvas slide={current} onUpdate={updateSlide} isPresenting={false} />
      </div>
    </div>
  );
}
