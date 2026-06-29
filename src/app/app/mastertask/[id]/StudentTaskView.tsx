"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { updateTaskStatus, saveSubmission } from "../actions";

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
  files: { id: string; name: string; mimeType: string; size: number }[];
};

type Progress = {
  status: string;
  comment: string | null;
  submissionPath: string | null;
  submissionName: string | null;
} | null;

const STATUS_LABEL: Record<string, string> = {
  todo: "Ausstehend",
  in_progress: "In Bearbeitung",
  done: "Fertig",
};

const STATUS_COLOR: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export function StudentTaskView({ task, progress }: { task: Task; progress: Progress }) {
  const [status, setStatus] = useState(progress?.status ?? "todo");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ path: string; name: string } | null>(
    progress?.submissionPath ? { path: progress.submissionPath, name: progress.submissionName! } : null
  );
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/mastertask/submission?taskId=${task.id}`, { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setUploadedFile({ path: data.path, name: data.name });
    }
    setUploading(false);
  }

  function handleStatusChange(newStatus: "todo" | "in_progress" | "done") {
    setStatus(newStatus);
    startTransition(() => updateTaskStatus(task.id, newStatus));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (uploadedFile) {
      fd.set("filePath", uploadedFile.path);
      fd.set("fileName", uploadedFile.name);
    }
    await saveSubmission(task.id, fd);
    setStatus("done");
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/app/mastertask" className="hover:underline">MasterTask</Link>
          <span>/</span>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-2xl font-bold flex-1">{task.title}</h1>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
          {task.subject && <span>{task.subject}</span>}
          {task.dueAt && (
            <span className={task.dueAt < new Date() && status !== "done" ? "text-destructive" : ""}>
              Abgabe: {task.dueAt.toLocaleDateString("de-DE")}
            </span>
          )}
        </div>
      </div>

      {/* Status buttons */}
      <div className="flex gap-2 flex-wrap">
        {(["todo", "in_progress", "done"] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              status === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {task.description && (
        <div className="bg-muted/50 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {task.description}
        </div>
      )}

      {(task.bookName || task.bookPageFrom || task.exerciseNr) && (
        <div className="border border-border rounded-xl p-4 space-y-1.5 text-sm">
          <h2 className="font-semibold text-sm mb-2">Aufgabeninfo</h2>
          {task.bookName && (
            <p>📖 {task.bookName}{task.bookPageFrom ? `, Seite ${task.bookPageFrom}${task.bookPageTo ? `–${task.bookPageTo}` : ""}` : ""}</p>
          )}
          {task.exerciseNr && <p>Aufgabe: {task.exerciseNr}</p>}
        </div>
      )}

      {/* Materials */}
      {task.files.length > 0 && (
        <div className="border border-border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold">Materialien</h2>
          <div className="space-y-2">
            {task.files.map((f) => (
              <a
                key={f.id}
                href={`/api/mastertask/download/${f.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <span className="truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Submission */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">Deine Abgabe</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Kommentar</label>
            <textarea
              name="comment"
              defaultValue={progress?.comment ?? ""}
              rows={3}
              placeholder="Fragen, Anmerkungen oder Erklärungen …"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Datei anhängen (optional)</label>
            {uploadedFile && (
              <div className="flex items-center gap-2 text-sm mb-2 p-2 bg-muted/50 rounded-lg">
                <span className="truncate">{uploadedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  ✕
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm border border-border rounded-lg px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
            >
              {uploading ? "Wird hochgeladen …" : uploadedFile ? "Andere Datei wählen" : "+ Datei hochladen"}
            </button>
          </div>

          <button
            type="submit"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Abgabe speichern & auf Fertig setzen
          </button>
        </form>
      </div>
    </div>
  );
}
