"use client";

import { cn } from "@/lib/utils";

interface Props {
  itemId: string;
  config: {
    rows: Array<Array<number | null>>;
  };
  value: Record<string, number | "">;
  onChange: (v: Record<string, number | "">) => void;
  feedback?: { isCorrect: boolean | null; solution?: Record<string, number> };
  readOnly?: boolean;
}

export function NumberWallWidget({
  itemId,
  config,
  value,
  onChange,
  feedback,
  readOnly,
}: Props) {
  const rows = config.rows;

  function cellKey(rowIdx: number, colIdx: number) {
    return `${rowIdx}-${colIdx}`;
  }

  function handleChange(key: string, raw: string) {
    const parsed = raw === "" ? "" : Number(raw);
    onChange({ ...value, [key]: parsed });
  }

  function cellState(rowIdx: number, colIdx: number): "correct" | "wrong" | null {
    if (!feedback || feedback.isCorrect === null) return null;
    const key = cellKey(rowIdx, colIdx);
    const cell = rows[rowIdx][colIdx];
    if (cell !== null) return null;
    if (!feedback.solution) return null;
    const correct = feedback.solution[key];
    const student = value[key];
    if (student === "" || student === undefined) return null;
    return Number(student) === correct ? "correct" : "wrong";
  }

  return (
    <div className="flex flex-col items-center gap-1 py-4 select-none">
      {[...rows].reverse().map((row, revIdx) => {
        const rowIdx = rows.length - 1 - revIdx;
        return (
          <div key={rowIdx} className="flex gap-1">
            {row.map((cell, colIdx) => {
              const key = cellKey(rowIdx, colIdx);
              const state = cellState(rowIdx, colIdx);
              const isFilled = cell !== null;

              if (isFilled) {
                return (
                  <div
                    key={colIdx}
                    className="flex min-h-[48px] min-w-[48px] items-center justify-center border border-border bg-surface text-sm font-semibold text-fg"
                  >
                    {cell}
                  </div>
                );
              }

              return (
                <input
                  key={colIdx}
                  type="number"
                  inputMode="numeric"
                  disabled={readOnly}
                  value={value[key] ?? ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className={cn(
                    "min-h-[48px] min-w-[48px] w-12 border bg-bg text-center text-sm font-semibold text-fg outline-none transition-colors",
                    "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    state === "correct" && "border-success ring-2 ring-success/30",
                    state === "wrong" && "border-danger ring-2 ring-danger/30",
                    !state && "border-border"
                  )}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
