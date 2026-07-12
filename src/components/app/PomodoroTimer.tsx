/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Coffee, BookOpen, X } from "lucide-react";

type Phase = "focus" | "break" | "long-break";

const DURATIONS: Record<Phase, number> = {
  focus: 25 * 60,
  break: 5 * 60,
  "long-break": 15 * 60,
};

const PHASE_LABEL: Record<Phase, string> = {
  focus: "Fokus",
  break: "Kurze Pause",
  "long-break": "Lange Pause",
};

const PHASE_COLOR: Record<Phase, string> = {
  focus: "text-brand",
  break: "text-success",
  "long-break": "text-info",
};

export function PomodoroTimer({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS["focus"]);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          // Notify
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(
              phase === "focus"
                ? "Fokus-Session beendet! 🎉 Mach eine Pause."
                : "Pause vorbei! Weiter lernen. 📚"
            );
          }
          // Auto-advance phase
          if (phase === "focus") {
            const newSessions = sessions + 1;
            setSessions(newSessions);
            const next: Phase = newSessions % 4 === 0 ? "long-break" : "break";
            setPhase(next);
            return DURATIONS[next];
          } else {
            setPhase("focus");
            return DURATIONS["focus"];
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, sessions]);

  function toggle() {
    if (!running && secondsLeft === DURATIONS[phase]) {
      // Request notification permission on first start
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(DURATIONS[phase]);
  }

  function switchPhase(p: Phase) {
    setRunning(false);
    setPhase(p);
    setSecondsLeft(DURATIONS[p]);
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  const progress = ((DURATIONS[phase] - secondsLeft) / DURATIONS[phase]) * 100;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 border border-border bg-bg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Pomodoro · {sessions} Sessions
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-fg transition-colors hover:text-fg"
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* Phase tabs */}
      <div className="flex border-b border-border">
        {(["focus", "break", "long-break"] as Phase[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => switchPhase(p)}
            className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              phase === p ? "bg-fg text-bg" : "text-muted-fg hover:bg-surface"
            }`}
          >
            {PHASE_LABEL[p]}
          </button>
        ))}
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center gap-4 px-6 py-6">
        {/* Progress ring */}
        <div className="relative">
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className={PHASE_COLOR[phase]}
              stroke="currentColor"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-bold tabular-nums tracking-tight">
              {minutes}:{seconds}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${PHASE_COLOR[phase]}`}>
              {PHASE_LABEL[phase]}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="grid size-9 place-items-center border border-border text-muted-fg transition-colors hover:text-fg"
            title="Zurücksetzen"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={toggle}
            className="grid size-12 place-items-center bg-fg text-bg transition-opacity hover:opacity-90"
          >
            {running
              ? <Pause className="size-5" strokeWidth={2} />
              : <Play className="size-5 translate-x-0.5" strokeWidth={2} />}
          </button>
          <button
            type="button"
            onClick={() => switchPhase(phase === "focus" ? "break" : "focus")}
            className="grid size-9 place-items-center border border-border text-muted-fg transition-colors hover:text-fg"
            title={phase === "focus" ? "Pause starten" : "Fokus starten"}
          >
            {phase === "focus"
              ? <Coffee className="size-4" strokeWidth={1.75} />
              : <BookOpen className="size-4" strokeWidth={1.75} />}
          </button>
        </div>

        {/* Session dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`size-2 rounded-full transition-colors ${
                i < sessions % 4
                  ? "bg-brand"
                  : sessions % 4 === 0 && sessions > 0 && i === 0
                  ? "bg-success"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-fg">Nach 4 Sessions → lange Pause</p>
      </div>
    </div>
  );
}
