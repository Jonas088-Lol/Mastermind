/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { cn } from "@/lib/utils";

interface Props {
  itemId: string;
  config: {
    center: number;
    operation: "+" | "-" | "*" | "/";
    spokes: Array<number | null>;
    outerValues?: Array<number | null>;
    mode: "fill_outer" | "fill_inner";
  };
  value: Record<string, number | "">;
  onChange: (v: Record<string, number | "">) => void;
  feedback?: { isCorrect: boolean | null; solution?: Record<string, number> };
  readOnly?: boolean;
}

const SPOKE_COUNT = 8;
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function computeExpected(
  center: number,
  operation: "+" | "-" | "*" | "/",
  inner: number
): number {
  switch (operation) {
    case "+": return center + inner;
    case "-": return center - inner;
    case "*": return center * inner;
    case "/": return center / inner;
  }
}

export function CalculationWheelWidget({
  itemId,
  config,
  value,
  onChange,
  feedback,
  readOnly,
}: Props) {
  const { center, operation, spokes, outerValues, mode } = config;

  function handleChange(idx: number, raw: string) {
    const parsed = raw === "" ? "" : Number(raw);
    onChange({ ...value, [String(idx)]: parsed });
  }

  function cellState(idx: number): "correct" | "wrong" | null {
    if (!feedback || feedback.isCorrect === null) return null;
    const key = String(idx);
    const spoke = spokes[idx];
    const outer = outerValues?.[idx];
    const isBlank = mode === "fill_outer" ? spoke === null : outer === null;
    if (!isBlank) return null;
    if (!feedback.solution) return null;
    const correct = feedback.solution[key];
    const student = value[key];
    if (student === "" || student === undefined) return null;
    return Number(student) === correct ? "correct" : "wrong";
  }

  const operatorLabel: Record<string, string> = {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷",
  };

  return (
    <div
      className="relative mx-auto"
      style={{ width: 320, height: 320, minWidth: 280, minHeight: 280 }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-brand bg-brand z-10">
          <span className="text-lg font-bold text-brand-fg leading-none">{center}</span>
          <span className="text-xs font-semibold text-brand-fg/80">{operatorLabel[operation]}</span>
        </div>
      </div>

      {Array.from({ length: SPOKE_COUNT }).map((_, idx) => {
        const angle = ANGLES[idx];
        const rad = ((angle - 90) * Math.PI) / 180;
        const cx = 160;
        const cy = 160;
        const spokeLen = 80;
        const outerDist = 120;

        const spokeEndX = cx + spokeLen * Math.cos(rad);
        const spokeEndY = cy + spokeLen * Math.sin(rad);
        const outerX = cx + outerDist * Math.cos(rad);
        const outerY = cy + outerDist * Math.sin(rad);

        const innerVal = spokes[idx];
        const outerVal = outerValues?.[idx];
        const state = cellState(idx);
        const outerIsBlank = mode === "fill_outer" ? spokes[idx] === null : outerValues?.[idx] === null || outerValues?.[idx] === undefined;

        return (
          <div key={idx}>
            <svg
              className="pointer-events-none absolute inset-0"
              width="320"
              height="320"
              style={{ zIndex: 1 }}
            >
              <line
                x1={cx}
                y1={cy}
                x2={spokeEndX}
                y2={spokeEndY}
                stroke="hsl(var(--border))"
                strokeWidth="2"
              />
            </svg>

            <div
              className="absolute z-20"
              style={{
                left: outerX - 24,
                top: outerY - 24,
                width: 48,
                height: 48,
              }}
            >
              {outerIsBlank ? (
                <input
                  type="number"
                  inputMode="numeric"
                  disabled={readOnly}
                  value={value[String(idx)] ?? ""}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  className={cn(
                    "h-full w-full border bg-bg text-center text-sm font-semibold text-fg outline-none transition-colors",
                    "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    state === "correct" && "border-success ring-2 ring-success/30",
                    state === "wrong" && "border-danger ring-2 ring-danger/30",
                    !state && "border-border"
                  )}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center border border-border bg-surface text-sm font-semibold text-fg">
                  {mode === "fill_outer"
                    ? (outerVal !== null && outerVal !== undefined ? outerVal : (innerVal !== null && innerVal !== undefined ? computeExpected(center, operation, innerVal) : ""))
                    : spokes[idx]}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
