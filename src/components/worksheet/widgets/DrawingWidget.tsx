"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Pen, Eraser, Trash2, Undo2 } from "lucide-react";

interface Props {
  itemId: string;
  config: {
    instruction?: string;
    width?: number;
    height?: number;
    bgColor?: string;
  };
  value: string;
  onChange: (dataUrl: string) => void;
  readOnly?: boolean;
}

type DrawColor = "black" | "red" | "blue" | "green";

interface Stroke {
  imageData: ImageData;
}

const COLOR_MAP: Record<DrawColor, string> = {
  black: "#1a1a1a",
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
};

const COLOR_LABELS: Record<DrawColor, string> = {
  black: "Schwarz",
  red: "Rot",
  blue: "Blau",
  green: "Grün",
};

export function DrawingWidget({ itemId, config, value, onChange, readOnly }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const strokesRef = useRef<Stroke[]>([]);
  const activePointersRef = useRef<Set<number>>(new Set());

  const [activeColor, setActiveColor] = useState<DrawColor>("black");
  const [isEraser, setIsEraser] = useState(false);

  const canvasWidth = config.width ?? 600;
  const canvasHeight = config.height ?? 300;
  const bgColor = config.bgColor ?? "#ffffff";

  // Initialize canvas background and load existing value
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCanvasPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const saveStroke = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    strokesRef.current = [...strokesRef.current.slice(-19), { imageData }];
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (readOnly) return;
      // Only handle primary pointer or pen; ignore extra touch points
      if (e.pointerType === "touch" && activePointersRef.current.size > 0) return;

      activePointersRef.current.add(e.pointerId);
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

      saveStroke();

      const { x, y } = getCanvasPoint(e);
      isDrawingRef.current = true;
      lastXRef.current = x;
      lastYRef.current = y;

      // Draw a dot for single taps
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pressure = e.pressure > 0 ? e.pressure : 0.5;
      const lineWidth = isEraser ? 20 : Math.min(3, Math.max(0.3, pressure * 3));

      ctx.beginPath();
      ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = isEraser ? bgColor : COLOR_MAP[activeColor];
      ctx.fill();
    },
    [readOnly, saveStroke, getCanvasPoint, isEraser, activeColor, bgColor]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || readOnly) return;
      if (!activePointersRef.current.has(e.pointerId)) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCanvasPoint(e);
      const pressure = e.pressure > 0 ? e.pressure : 0.5;
      const lineWidth = isEraser ? 20 : Math.min(3, Math.max(0.3, pressure * 3));

      ctx.beginPath();
      ctx.moveTo(lastXRef.current, lastYRef.current);
      ctx.lineTo(x, y);
      ctx.strokeStyle = isEraser ? bgColor : COLOR_MAP[activeColor];
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      lastXRef.current = x;
      lastYRef.current = y;
    },
    [readOnly, getCanvasPoint, isEraser, activeColor, bgColor]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!activePointersRef.current.has(e.pointerId)) return;
      activePointersRef.current.delete(e.pointerId);

      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      const canvas = canvasRef.current;
      if (!canvas) return;
      onChange(canvas.toDataURL("image/png"));
    },
    [onChange]
  );

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const strokes = strokesRef.current;
    if (strokes.length === 0) {
      // Undo to blank canvas
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const prev = strokes[strokes.length - 1];
      ctx.putImageData(prev.imageData, 0, 0);
      strokesRef.current = strokes.slice(0, -1);
    }
    onChange(canvas.toDataURL("image/png"));
  }, [bgColor, onChange]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    saveStroke();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange(canvas.toDataURL("image/png"));
  }, [bgColor, saveStroke, onChange]);

  return (
    <div className="flex flex-col gap-2">
      {config.instruction && (
        <p className="text-sm text-fg">{config.instruction}</p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5 border border-border bg-surface px-2 py-1.5">
          {/* Pen tool */}
          <button
            type="button"
            onClick={() => setIsEraser(false)}
            aria-label="Stift"
            title="Stift"
            className={`flex items-center justify-center size-7 transition-colors ${
              !isEraser
                ? "bg-brand text-brand-fg"
                : "text-muted-fg hover:text-fg hover:bg-bg"
            }`}
          >
            <Pen className="size-4" strokeWidth={1.75} />
          </button>

          {/* Color swatches */}
          {(Object.keys(COLOR_MAP) as DrawColor[]).map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setActiveColor(color);
                setIsEraser(false);
              }}
              aria-label={COLOR_LABELS[color]}
              title={COLOR_LABELS[color]}
              className={`size-5 rounded-full border-2 transition-transform ${
                !isEraser && activeColor === color
                  ? "border-brand scale-110"
                  : "border-border hover:scale-110"
              }`}
              style={{ backgroundColor: COLOR_MAP[color] }}
            />
          ))}

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Eraser */}
          <button
            type="button"
            onClick={() => setIsEraser(true)}
            aria-label="Radierer"
            title="Radierer"
            className={`flex items-center justify-center size-7 transition-colors ${
              isEraser
                ? "bg-brand text-brand-fg"
                : "text-muted-fg hover:text-fg hover:bg-bg"
            }`}
          >
            <Eraser className="size-4" strokeWidth={1.75} />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            aria-label="Rückgängig"
            title="Rückgängig"
            className="flex items-center justify-center size-7 text-muted-fg hover:text-fg hover:bg-bg transition-colors"
          >
            <Undo2 className="size-4" strokeWidth={1.75} />
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            aria-label="Alles löschen"
            title="Alles löschen"
            className="flex items-center justify-center size-7 text-muted-fg hover:text-danger hover:bg-bg transition-colors"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        id={itemId}
        width={canvasWidth}
        height={canvasHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          touchAction: "none",
          maxWidth: "100%",
          cursor: readOnly ? "default" : isEraser ? "cell" : "crosshair",
          display: "block",
          border: "1px solid var(--color-border)",
          backgroundColor: bgColor,
        }}
      />
    </div>
  );
}
