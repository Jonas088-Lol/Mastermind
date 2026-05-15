"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface Props {
  initialSeconds: number;
  onTimeUp?: () => void;
  autoStart?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorksheetTimer({
  initialSeconds,
  onTimeUp,
  autoStart = false,
  className,
}: Props) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(autoStart);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // Reset when initialSeconds prop changes
  useEffect(() => {
    setRemaining(initialSeconds);
    setRunning(autoStart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeconds]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) return;

    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setRunning(false);
          onTimeUpRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [running, remaining]);

  const handleReset = useCallback(() => {
    setRunning(false);
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  const progress = initialSeconds > 0 ? remaining / initialSeconds : 0;
  const pct25 = remaining < initialSeconds * 0.25;
  const pct10 = remaining < initialSeconds * 0.1;

  const barColor = pct10
    ? "bg-danger"
    : pct25
    ? "bg-warning"
    : "bg-success";

  const textColor = pct10
    ? "text-danger"
    : pct25
    ? "text-warning"
    : "text-success";

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {/* Time display + controls */}
      <div className="flex items-center gap-3">
        <span
          className={`font-mono text-2xl font-semibold tabular-nums ${textColor} transition-colors`}
        >
          {formatTime(remaining)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            disabled={remaining === 0}
            aria-label={running ? "Pausieren" : "Starten"}
            className="flex items-center justify-center size-8 border border-border bg-surface text-fg hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <Pause className="size-4" strokeWidth={1.75} />
            ) : (
              <Play className="size-4" strokeWidth={1.75} />
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            aria-label="Zurücksetzen"
            className="flex items-center justify-center size-8 border border-border bg-surface text-muted-fg hover:text-fg hover:bg-bg transition-colors"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-border overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
