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

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div>
        <Link href={`/app/mastertask/${task.id}`} className="font-semibold hover:underline leading-tight block">
          {task.title}
        </Link>
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
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className={`border-t-4 ${col.color} bg-muted/20 rounded-xl p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">{col.label}</h2>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{columnTasks.length}</span>
            </div>
            <div className="space-y-3">
              {columnTasks.map((t) => <TaskCard key={t.id} task={t} />)}
              {columnTasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Keine Aufgaben</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
