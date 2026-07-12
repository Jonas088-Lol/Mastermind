/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  itemId: string;
  config: {
    min: number;
    max: number;
    step: number;
    toPlace: number[];
    showNumbers?: boolean;
  };
  value: number[];
  onChange: (v: number[]) => void;
  feedback?: { isCorrect: boolean | null };
  readOnly?: boolean;
}

export function NumberLineWidget({
  itemId,
  config,
  value,
  onChange,
  feedback,
  readOnly,
}: Props) {
  const { min, max, step, toPlace, showNumbers = true } = config;
  const lineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ val: number; from: "tray" | "line" } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);

  const range = max - min;
  const ticks: number[] = [];
  for (let t = min; t <= max; t += step) ticks.push(t);

  const unplaced = toPlace.filter((v) => !value.includes(v));

  function pctOf(v: number) {
    return ((v - min) / range) * 100;
  }

  function snapToTick(clientX: number): number {
    const rect = lineRef.current?.getBoundingClientRect();
    if (!rect) return min;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + pct * range;
    const snapped = Math.round((raw - min) / step) * step + min;
    return Math.max(min, Math.min(max, snapped));
  }

  function isOnLine(clientY: number) {
    const rect = lineRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return clientY >= rect.top - 40 && clientY <= rect.bottom + 40;
  }

  function chipState(v: number): "correct" | "wrong" | null {
    if (!feedback || feedback.isCorrect === null) return null;
    if (!value.includes(v)) return null;
    return toPlace.includes(v) ? "correct" : "wrong";
  }

  const handlePointerMove = useCallback((e: PointerEvent) => {
    setDragX(e.clientX);
    setDragY(e.clientY);
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!dragging || readOnly) {
      setDragging(null);
      return;
    }
    const snapped = snapToTick(e.clientX);
    if (isOnLine(e.clientY)) {
      if (dragging.from === "tray") {
        onChange([...value, snapped]);
      } else {
        const next = value.filter((v) => v !== dragging.val);
        onChange([...next, snapped]);
      }
    } else if (dragging.from === "line") {
      onChange(value.filter((v) => v !== dragging.val));
    }
    setDragging(null);
  }, [dragging, value, onChange, readOnly]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  function startDrag(e: React.PointerEvent, val: number, from: "tray" | "line") {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging({ val, from });
    setDragX(e.clientX);
    setDragY(e.clientY);
  }

  return (
    <div className="flex flex-col gap-6 py-4 select-none">
      <div className="flex flex-wrap gap-2 min-h-[48px] items-center">
        {toPlace.map((v) => (
          <div
            key={v}
            onPointerDown={(e) => {
              if (value.includes(v)) {
                startDrag(e, v, "line");
              } else {
                startDrag(e, v, "tray");
              }
            }}
            className={cn(
              "flex h-11 min-w-[44px] cursor-grab items-center justify-center border px-3 text-sm font-semibold touch-none",
              "transition-opacity",
              value.includes(v) ? "opacity-30 border-border bg-surface text-muted-fg" : "border-brand bg-brand text-brand-fg",
              readOnly && "cursor-default"
            )}
          >
            {v}
          </div>
        ))}
      </div>

      <div className="relative mx-4 pb-8">
        <div
          ref={lineRef}
          className="relative h-2 bg-border rounded-none"
        >
          <div className="absolute inset-0 bg-border" />

          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${pctOf(t)}%`, transform: "translateX(-50%)" }}
            >
              <div className="w-px h-4 bg-muted-fg mt-[-4px]" />
              {showNumbers && (
                <span className="mt-1 text-xs text-muted-fg whitespace-nowrap">{t}</span>
              )}
            </div>
          ))}

          {value.map((v, i) => {
            const state = chipState(v);
            return (
              <div
                key={`${v}-${i}`}
                onPointerDown={(e) => startDrag(e, v, "line")}
                className={cn(
                  "absolute top-[-16px] flex h-9 min-w-[36px] cursor-grab items-center justify-center border px-2 text-sm font-semibold touch-none",
                  "transition-colors",
                  state === "correct" && "border-success bg-success text-brand-fg",
                  state === "wrong" && "border-danger bg-danger text-brand-fg",
                  !state && "border-brand bg-brand text-brand-fg",
                  readOnly && "cursor-default"
                )}
                style={{ left: `${pctOf(v)}%`, transform: "translateX(-50%)" }}
              >
                {v}
              </div>
            );
          })}
        </div>
      </div>

      {dragging && (
        <div
          className="pointer-events-none fixed z-50 flex h-9 min-w-[36px] items-center justify-center border border-brand bg-brand text-brand-fg px-2 text-sm font-semibold opacity-80"
          style={{ left: dragX - 18, top: dragY - 18 }}
        >
          {dragging.val}
        </div>
      )}
    </div>
  );
}
