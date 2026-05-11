"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { updateAttendance } from "./actions";

type Status = "anwesend" | "fehlt" | "verspaetet" | "entschuldigt";

const STATUS_LABELS: Record<Status, string> = {
  anwesend: "A",
  fehlt: "F",
  verspaetet: "V",
  entschuldigt: "E",
};

const STATUSES: Status[] = ["anwesend", "fehlt", "verspaetet", "entschuldigt"];

interface AttendanceButtonsProps {
  recordId: string | null;
  lessonId: string;
  studentId: string;
  currentStatus: string;
}

export function AttendanceButtons({
  recordId,
  lessonId,
  studentId,
  currentStatus,
}: AttendanceButtonsProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick(status: Status) {
    if (status === currentStatus) return;
    startTransition(() => {
      void updateAttendance(recordId, lessonId, studentId, status);
    });
  }

  return (
    <div className={cn("flex gap-1", isPending && "opacity-50")}>
      {STATUSES.map((status) => {
        const active = currentStatus === status;
        return (
          <button
            key={status}
            type="button"
            aria-label={`Als ${status} markieren`}
            aria-pressed={active}
            disabled={isPending}
            onClick={() => handleClick(status)}
            className={cn(
              "grid size-7 place-items-center font-mono text-xs font-bold transition-colors",
              active
                ? "bg-fg text-bg"
                : "border border-border bg-bg text-muted-fg hover:border-fg/30 hover:text-fg"
            )}
          >
            {STATUS_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}
