/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import Link from "next/link";
import { useTransition } from "react";
import { updateTaskStatus } from "./actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  dueAt: Date | null;
  bookName: string | null;
  bookPageFrom: number | null;
  bookPageTo: number | null;
  exerciseNr: string | null;
  status: "todo" | "in_progress" | "done";
  _count: { files: number };
};

const COLUMNS: { key: "todo" | "in_progress" | "done"; label: string; color: string }[] = [
  { key: "todo", label: "Ausstehend", color: "border-muted" },
  { key: "in_progress", label: "In Bearbeitung", color: "border-yellow-400" },
  { key: "done", label: "Fertig", color: "border-green-500" },
];

function dueBadge(dueAt: Date | null, status: Task["status"]): { label: string; className: string } | null {
  if (!dueAt || status === "done") return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDue = new Date(dueAt);
  startOfDue.setHours(0, 0, 0, 0);
  const days = Math.round((startOfDue.getTime() - startOfToday.getTime()) / msPerDay);
  if (days < 0) {
    return {
      label: `Überfällig seit ${Math.abs(days)} Tag${Math.abs(days) !== 1 ? "en" : ""}`,
      className: "bg-destructive/10 text-destructive border-destructive/30",
    };
  }
  if (days === 0) {
    return { label: "Heute fällig", className: "bg-destructive/10 text-destructive border-destructive/30" };
  }
  if (days <= 3) {
    return {
      label: `Noch ${days} Tag${days !== 1 ? "e" : ""}`,
      className: "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 border-yellow-400/30",
    };
  }
  return { label: `Noch ${days} Tage`, className: "bg-muted text-muted-foreground border-border" };
}

function sortByDue(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return 0;
  });
}

function TaskCard({ task }: { task: Task }) {
  const [, startTransition] = useTransition();

  const nextStatus: Record<string, "todo" | "in_progress" | "done"> = {
    todo: "in_progress",
    in_progress: "done",
    done: "todo",
  };

  const nextLabel: Record<string, string> = {
    todo: "→ In Bearbeitung",
    in_progress: "→ Fertig",
    done: "↩ Zurücksetzen",
  };

  const badge = dueBadge(task.dueAt, task.status);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <Link href={`/app/mastertask/${task.id}`} className="font-semibold hover:underline leading-tight block">
            {task.title}
          </Link>
          {badge && (
            <span className={`shrink-0 text-[11px] font-medium border rounded-full px-2 py-0.5 ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
        {task.subject && <p className="text-xs text-muted-foreground mt-0.5">{task.subject}</p>}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {task.bookName && (
          <span>📖 {task.bookName}{task.bookPageFrom ? `, S. ${task.bookPageFrom}${task.bookPageTo ? `–${task.bookPageTo}` : ""}` : ""}</span>
        )}
        {task.exerciseNr && <span>{task.exerciseNr}</span>}
        {task.dueAt && (
          <span className={task.dueAt < new Date() && task.status !== "done" ? "text-destructive" : ""}>
            Bis {task.dueAt.toLocaleDateString("de-DE")}
          </span>
        )}
        {task._count.files > 0 && <span>{task._count.files} Datei{task._count.files !== 1 ? "en" : ""}</span>}
      </div>

      <button
        onClick={() => startTransition(() => updateTaskStatus(task.id, nextStatus[task.status]))}
        className="w-full text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors text-center"
      >
        {nextLabel[task.status]}
      </button>
    </div>
  );
}

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const openCount = total - doneCount;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <p className="font-semibold">
            {doneCount} von {total} Aufgaben erledigt
          </p>
          <p className="text-xs text-muted-foreground">
            {openCount === 0 ? "Alles erledigt 🎉" : `${openCount} offen`} · {percent}%
          </p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

    <div className="grid gap-5 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const columnTasks = sortByDue(tasks.filter((t) => t.status === col.key));
        return (
          <div key={col.key} className={`border-t-4 ${col.color} bg-muted/20 rounded-xl p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">{col.label}</h2>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{columnTasks.length}</span>
            </div>
            <div className="space-y-3">
              {columnTasks.map((t) => <TaskCard key={t.id} task={t} />)}
              {columnTasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {col.key === "done" ? "Noch nichts erledigt" : "Keine Aufgaben"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
