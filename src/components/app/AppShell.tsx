"use client";

import { useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { PomodoroTimer } from "./PomodoroTimer";
import { Timer } from "lucide-react";

export function AppShell() {
  const [pomodoroOpen, setPomodoroOpen] = useState(false);

  return (
    <>

      {/* Floating Pomodoro button */}
      {!pomodoroOpen && (
        <button
          type="button"
          onClick={() => setPomodoroOpen(true)}
          title="Pomodoro-Timer (Fokus-Sessions)"
          className="fixed bottom-20 right-4 z-40 grid size-11 place-items-center border border-border bg-bg shadow-lg transition-colors hover:border-brand hover:text-brand lg:bottom-4"
        >
          <Timer className="size-5" strokeWidth={1.75} />
        </button>
      )}

      <CommandPalette onOpenPomodoro={() => setPomodoroOpen(true)} />

      {pomodoroOpen && (
        <PomodoroTimer onClose={() => setPomodoroOpen(false)} />
      )}
    </>
  );
}
