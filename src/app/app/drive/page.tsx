"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Upload,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Trash2,
  Download,
  Globe,
  Lock,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
  createdAt: string;
};

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image className="size-5 text-blue-400" />;
  if (mimeType.startsWith("video/")) return <Film className="size-5 text-purple-400" />;
  if (mimeType.startsWith("audio/")) return <Music className="size-5 text-green-400" />;
  if (mimeType.includes("zip")) return <Archive className="size-5 text-yellow-400" />;
  return <FileText className="size-5 text-muted-fg" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  async function loadFiles() {
    const res = await fetch("/api/drive/list");
    if (res.ok) setFiles(await res.json());
    setLoading(false);
  }

  useEffect(() => { void loadFiles(); }, []);

  async function upload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("isPublic", String(isPublic));
      const res = await fetch("/api/drive/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Upload fehlgeschlagen" }));
        setError(msg ?? "Upload fehlgeschlagen");
      }
    }
    setUploading(false);
    void loadFiles();
  }

  async function deleteFile(id: string, name: string) {
    if (!confirm(`"${name}" wirklich löschen?`)) return;
    await fetch(`/api/drive/files/${id}`, { method: "DELETE" });
    startTransition(() => setFiles((f) => f.filter((x) => x.id !== id)));
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Drive</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
          <HardDrive className="size-8 text-brand" strokeWidth={1.5} />
          Meine Dateien
        </h1>
        <p className="mt-1 text-sm text-muted-fg">{files.length} Dateien gespeichert</p>
      </header>

      {/* Upload zone */}
      <div
        className={cn(
          "relative flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragOver ? "border-brand bg-brand/5" : "border-border bg-surface"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void upload(e.dataTransfer.files); }}
      >
        <Upload className="size-10 text-muted-fg" strokeWidth={1.5} />
        <div>
          <p className="font-semibold">Dateien hierher ziehen</p>
          <p className="text-sm text-muted-fg">oder</p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? "Wird hochgeladen…" : "Datei auswählen"}
          </button>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-fg">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            Für alle Schulnutzer sichtbar
          </label>
        </div>
        <p className="text-xs text-muted-fg">PDF, Bilder, Videos, Audio, Office-Dateien, ZIP · max. 100 MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-fg">Lädt…</div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-fg">
          <HardDrive className="size-10" strokeWidth={1.5} />
          <p className="text-sm">Noch keine Dateien hochgeladen</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-4 px-5 py-3.5">
              <FileIcon mimeType={f.mimeType} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-fg">
                  {formatBytes(f.size)} · {new Date(f.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              {f.isPublic ? (
                <span title="Schulweit sichtbar" className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                  <Globe className="size-3" /> Öffentlich
                </span>
              ) : (
                <span title="Nur für dich" className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-fg">
                  <Lock className="size-3" /> Privat
                </span>
              )}
              <a
                href={`/api/drive/download/${f.id}`}
                className="flex size-8 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-muted hover:text-fg"
                title="Herunterladen"
              >
                <Download className="size-4" />
              </a>
              <button
                onClick={() => void deleteFile(f.id, f.name)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger"
                title="Löschen"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
