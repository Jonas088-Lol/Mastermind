"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { deleteMasterTask, deleteMasterTaskFile } from "../actions";

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
  class: { id: string; name: string };
  files: { id: string; name: string; mimeType: string; size: number }[];
};

type StudentWithProgress = {
  id: string;
  name: string;
  avatarUrl: string | null;
  progress: {
    status: string;
    comment: string | null;
    submissionPath: string | null;
    submissionName: string | null;
    updatedAt: Date;
  } | null;
};

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

export function MasterTaskTeacherDetail({
  task,
  students,
}: {
  task: Task;
  students: StudentWithProgress[];
}) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState(task.files);
  const fileRef = useRef<HTMLInputElement>(null);

  const doneCount = students.filter((s) => s.progress?.status === "done").length;
  const inProgressCount = students.filter((s) => s.progress?.status === "in_progress").length;

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/mastertask/upload?taskId=${task.id}`, { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setFiles((prev) => [...prev, { id: data.id, name: data.name, mimeType: file.type, size: file.size }]);
    }
    setUploading(false);
  }

  async function handleDeleteFile(fileId: string) {
    await deleteMasterTaskFile(fileId, task.id);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/teach/mastertask" className="hover:underline">MasterTask</Link>
            <span>/</span>
            <span>Klasse {task.class.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            {task.subject && <span>{task.subject}</span>}
            {task.dueAt && <span>Abgabe: {task.dueAt.toLocaleDateString("de-DE")}</span>}
            {task.exerciseNr && <span>{task.exerciseNr}</span>}
          </div>
        </div>
        <form action={deleteMasterTask.bind(null, task.id)}>
          <button
            type="submit"
            className="text-sm text-destructive border border-destructive/30 rounded-lg px-3 py-1.5 hover:bg-destructive/10 transition-colors"
            onClick={(e) => { if (!confirm("Aufgabe wirklich löschen?")) e.preventDefault(); }}
          >
            Löschen
          </button>
        </form>
      </div>

      {task.description && (
        <div className="bg-muted/50 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {task.description}
        </div>
      )}

      {(task.bookName || task.bookPageFrom) && (
        <div className="border border-border rounded-xl p-4 text-sm">
          <span className="font-medium">Buchseiten:</span>{" "}
          {task.bookName && <span>{task.bookName}</span>}
          {task.bookPageFrom && (
            <span>, S. {task.bookPageFrom}{task.bookPageTo ? `–${task.bookPageTo}` : ""}</span>
          )}
        </div>
      )}

      {/* Materials upload */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">Erklärungsmaterialien</h2>
        {files.length === 0 && !uploading && (
          <p className="text-sm text-muted-foreground">Noch keine Dateien hochgeladen.</p>
        )}
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 text-sm py-1">
              <a
                href={`/api/mastertask/download/${f.id}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline truncate"
              >
                {f.name}
              </a>
              <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                <span>{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => handleDeleteFile(f.id)}
                  className="text-destructive hover:underline"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-sm border border-border rounded-lg px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
          >
            {uploading ? "Wird hochgeladen …" : "+ Datei hochladen"}
          </button>
        </div>
      </div>

      {/* Student progress */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-lg">Schülerfortschritt</h2>
          <div className="text-sm text-muted-foreground">
            {doneCount}/{students.length} fertig · {inProgressCount} in Bearbeitung
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Schüler</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Abgabe</th>
                <th className="text-left px-4 py-3 font-medium">Kommentar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[s.progress?.status ?? "todo"]}`}>
                      {STATUS_LABEL[s.progress?.status ?? "todo"]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.progress?.submissionName ? (
                      <a href="#" className="hover:underline text-primary text-xs">
                        {s.progress.submissionName}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">
                    {s.progress?.comment ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
