/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useTransition } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toggleExerciseDone } from "@/app/teach/uebungen/actions";

export type TeacherExerciseItem = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  topic: string;
  teacherName: string;
  createdAt: string; // ISO
  done: boolean;
};

export function TeacherExerciseCard({ exercise }: { exercise: TeacherExerciseItem }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={`rounded-2xl border border-border bg-bg p-4 transition-opacity ${exercise.done ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-semibold ${exercise.done ? "line-through text-muted-fg" : ""}`}>
              {exercise.title}
            </p>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
              {exercise.subject}
            </span>
            <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-fg">
              {exercise.topic}
            </span>
          </div>
          {exercise.description && (
            <p className="mt-1.5 text-sm text-muted-fg whitespace-pre-wrap">{exercise.description}</p>
          )}
          <p className="mt-1.5 text-xs text-muted-fg">
            Von {exercise.teacherName} · erstellt am{" "}
            {new Date(exercise.createdAt).toLocaleDateString("de-DE")}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => toggleExerciseDone(exercise.id, !exercise.done))}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
            exercise.done
              ? "border-border bg-surface text-muted-fg hover:text-fg"
              : "border-brand/30 bg-brand/5 text-brand hover:bg-brand/10"
          }`}
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : exercise.done ? (
            <Circle className="size-3" />
          ) : (
            <CheckCircle2 className="size-3" />
          )}
          <span className="hidden sm:inline">{exercise.done ? "Offen" : "Erledigt"}</span>
        </button>
      </div>
    </div>
  );
}
