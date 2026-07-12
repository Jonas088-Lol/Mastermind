/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { cn } from "@/lib/utils";

interface Props {
  itemId: string;
  config: {
    task?: string;
    mode: "mark" | "fill";
    preMarked?: number[];
    toFill?: Array<{ cell: number; value?: number }>;
  };
  value: number[] | Record<string, number | "">;
  onChange: (v: number[] | Record<string, number | "">) => void;
  feedback?: { isCorrect: boolean | null; correct?: number[] };
  readOnly?: boolean;
}

export function HundredChartWidget({
  itemId,
  config,
  value,
  onChange,
  feedback,
  readOnly,
}: Props) {
  const { mode, preMarked = [], toFill = [] } = config;

  const markedSet = new Set<number>(
    mode === "mark" ? (value as number[]) : []
  );
  const fillMap: Record<string, number | ""> =
    mode === "fill" ? (value as Record<string, number | "">) : {};
  const toFillSet = new Set(toFill.map((t) => t.cell));
  const correctSet = new Set(feedback?.correct ?? []);

  function toggleMark(n: number) {
    if (readOnly || mode !== "mark") return;
    if (preMarked.includes(n)) return;
    const arr = value as number[];
    if (arr.includes(n)) {
      onChange(arr.filter((v) => v !== n));
    } else {
      onChange([...arr, n]);
    }
  }

  function handleFillChange(n: number, raw: string) {
    if (readOnly || mode !== "fill") return;
    const parsed = raw === "" ? "" : Number(raw);
    onChange({ ...fillMap, [String(n)]: parsed });
  }

  function cellMarkState(n: number): "pre" | "marked" | "correct" | "wrong" | null {
    if (preMarked.includes(n)) return "pre";
    if (!markedSet.has(n)) return null;
    if (feedback && feedback.isCorrect !== null) {
      return correctSet.has(n) ? "correct" : "wrong";
    }
    return "marked";
  }

  function fillState(n: number): "correct" | "wrong" | null {
    if (!feedback || feedback.isCorrect === null) return null;
    const entry = toFill.find((t) => t.cell === n);
    if (!entry) return null;
    const student = fillMap[String(n)];
    if (student === "" || student === undefined) return null;
    return Number(student) === entry.value ? "correct" : "wrong";
  }

  const cells = Array.from({ length: 100 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-3">
      {config.task && (
        <p className="text-sm text-fg">{config.task}</p>
      )}
      <div
        className="grid gap-px bg-border border border-border"
        style={{ gridTemplateColumns: "repeat(10, minmax(36px, 1fr))" }}
      >
        {cells.map((n) => {
          if (mode === "mark") {
            const state = cellMarkState(n);
            return (
              <button
                key={n}
                type="button"
                disabled={readOnly || preMarked.includes(n)}
                onClick={() => toggleMark(n)}
                className={cn(
                  "flex min-h-[36px] w-full items-center justify-center text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                  "disabled:cursor-default",
                  state === "pre" && "bg-brand/30 text-fg",
                  state === "marked" && "bg-brand/30 text-fg",
                  state === "correct" && "bg-success text-brand-fg",
                  state === "wrong" && "bg-danger text-brand-fg",
                  !state && "bg-bg text-fg hover:bg-surface"
                )}
              >
                {n}
              </button>
            );
          }

          if (toFillSet.has(n)) {
            const state = fillState(n);
            return (
              <input
                key={n}
                type="number"
                inputMode="numeric"
                disabled={readOnly}
                value={fillMap[String(n)] ?? ""}
                onChange={(e) => handleFillChange(n, e.target.value)}
                className={cn(
                  "min-h-[36px] w-full border-0 bg-bg text-center text-xs font-medium text-fg outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                  state === "correct" && "bg-success text-brand-fg",
                  state === "wrong" && "bg-danger text-brand-fg"
                )}
              />
            );
          }

          return (
            <div
              key={n}
              className="flex min-h-[36px] w-full items-center justify-center bg-surface text-xs font-medium text-fg"
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}
