/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Pen, Undo2, Trash2, Download, Minus, Plus } from "lucide-react";

type Tool = "pen" | "eraser";

interface Point { x: number; y: number }
interface Stroke { tool: Tool; color: string; width: number; points: Point[] }

const COLORS = [
  "#1e1e2e", // black
  "#ef4444", // red
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // yellow
  "#8b5cf6", // purple
  "#f97316", // orange
  "#6b7280", // gray
];

interface DrawingCanvasProps {
  pageId: string;
}

export function DrawingCanvas({ pageId: _pageId }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(2);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const isDrawing = useRef(false);

  // Redraw everything
  const redraw = useCallback((allStrokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.lineWidth = stroke.tool === "eraser" ? stroke.width * 4 : stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    redraw(strokes);
  }, [strokes, redraw]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = Math.max(500, rect.height);
      redraw(strokes);
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [strokes, redraw]);

  function getPos(e: React.MouseEvent | React.TouchEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    isDrawing.current = true;
    setRedoStack([]);
    const pos = getPos(e);
    const stroke: Stroke = { tool, color, width: lineWidth, points: [pos] };
    setCurrentStroke(stroke);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current || !currentStroke) return;
    e.preventDefault();
    const pos = getPos(e);

    const updated: Stroke = { ...currentStroke, points: [...currentStroke.points, pos] };
    setCurrentStroke(updated);

    // Live draw on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pts = updated.points;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = updated.tool === "eraser" ? "#ffffff" : updated.color;
    ctx.lineWidth = updated.tool === "eraser" ? updated.width * 4 : updated.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }

  function endDraw() {
    if (!isDrawing.current || !currentStroke) return;
    isDrawing.current = false;
    if (currentStroke.points.length > 1) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  }

  function undo() {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      const next = prev.slice(0, -1);
      redraw(next);
      return next;
    });
  }

  function redo() {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => {
        const next = [...s, last];
        redraw(next);
        return next;
      });
      return prev.slice(0, -1);
    });
  }

  function clear() {
    setStrokes([]);
    setRedoStack([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "zeichnung.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border border-border bg-surface p-2">
        {/* Tool toggle */}
        <div className="flex border border-border">
          <button
            type="button"
            onClick={() => setTool("pen")}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
              tool === "pen" ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
            }`}
            title="Stift"
          >
            <Pen className="size-3.5" strokeWidth={1.75} />
            Stift
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={`flex items-center gap-1 border-l border-border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              tool === "eraser" ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
            }`}
            title="Radierer"
          >
            <Eraser className="size-3.5" strokeWidth={1.75} />
            Radierer
          </button>
        </div>

        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setTool("pen"); }}
              className={`size-6 transition-all ${
                color === c && tool === "pen" ? "ring-2 ring-brand ring-offset-1" : "ring-1 ring-border"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        {/* Line width */}
        <div className="flex items-center gap-1 border border-border px-2 py-1">
          <button
            type="button"
            onClick={() => setLineWidth((w) => Math.max(1, w - 1))}
            className="text-muted-fg hover:text-fg"
          >
            <Minus className="size-3" strokeWidth={2} />
          </button>
          <span className="w-4 text-center font-mono text-xs">{lineWidth}</span>
          <button
            type="button"
            onClick={() => setLineWidth((w) => Math.min(20, w + 1))}
            className="text-muted-fg hover:text-fg"
          >
            <Plus className="size-3" strokeWidth={2} />
          </button>
        </div>

        {/* Actions */}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={strokes.length === 0}
            className="grid size-8 place-items-center border border-border bg-bg text-muted-fg transition-colors hover:text-fg disabled:opacity-30"
            title="Rückgängig"
          >
            <Undo2 className="size-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={redoStack.length === 0}
            className="grid size-8 place-items-center border border-border bg-bg text-muted-fg transition-colors hover:text-fg disabled:opacity-30"
            title="Wiederholen"
          >
            <Undo2 className="size-3.5 scale-x-[-1]" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={download}
            className="grid size-8 place-items-center border border-border bg-bg text-muted-fg transition-colors hover:text-fg"
            title="Als PNG speichern"
          >
            <Download className="size-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={strokes.length === 0}
            className="grid size-8 place-items-center border border-border bg-bg text-muted-fg transition-colors hover:text-danger disabled:opacity-30"
            title="Alles löschen"
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full min-h-[500px] border border-border bg-white">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {strokes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-400">Hier zeichnen — Stift wählen und loslegen</p>
          </div>
        )}
      </div>
    </div>
  );
}
