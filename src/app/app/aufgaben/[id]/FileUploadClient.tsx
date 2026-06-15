"use client";

import { useRef, useState } from "react";
import { Download, Paperclip, Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface UploadedFile {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface FileUploadClientProps {
  assignmentId: string;
  disabled?: boolean;
  existingFiles?: UploadedFile[];
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadClient({ assignmentId, disabled, existingFiles = [] }: FileUploadClientProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    setProgress(0);

    const uploadId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "X-Upload-Id": uploadId,
            "X-Chunk-Index": String(i),
            "X-Total-Chunks": String(totalChunks),
            "X-Filename": file.name,
            "X-Mime-Type": file.type || "application/octet-stream",
            "X-Total-Size": String(file.size),
            "X-Assignment-Id": assignmentId,
          },
          body: chunk,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload fehlgeschlagen");
        }

        if (i + 1 >= totalChunks) {
          const data = await res.json();
          setUploads((prev) => [
            ...prev,
            { id: data.id, filename: data.filename, size: data.size, mimeType: data.mimeType },
          ]);
        }

        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (disabled) {
    return uploads.length > 0 ? (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Angehängte Dateien</p>
        {uploads.map((f) => (
          <a
            key={f.id}
            href={`/api/files/${f.id}?download=1`}
            className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-2 text-sm transition-colors hover:bg-surface"
          >
            <Paperclip className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
            <span className="flex-1 truncate font-medium">{f.filename}</span>
            <span className="text-xs text-muted-fg">{formatBytes(f.size)}</span>
            <Download className="size-3.5 shrink-0 text-muted-fg" />
          </a>
        ))}
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
        Dateien anhängen <span className="font-normal">(optional)</span>
      </p>

      {uploads.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {uploads.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-sm">
              <CheckCircle2 className="size-4 shrink-0 text-success" strokeWidth={1.75} />
              <span className="flex-1 truncate">{f.filename}</span>
              <span className="text-xs text-muted-fg">{formatBytes(f.size)}</span>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
          <Loader2 className="size-4 animate-spin text-brand" />
          <div className="flex-1">
            <div className="h-1.5 w-full bg-surface">
              <div className="h-1.5 bg-brand transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="text-xs text-muted-fg">{progress}%</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-bg px-4 py-3 text-sm text-muted-fg hover:border-brand hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Upload className="size-4" />
        Datei hochladen (max. 10 GB)
      </button>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        accept="video/*,audio/*,.pdf,image/*,.zip"
      />
    </div>
  );
}
