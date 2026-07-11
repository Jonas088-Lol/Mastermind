"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Trash2,
  Download,
  Globe,
  Lock,
  HardDrive,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
  createdAt: string;
  userId: string;
};

type FileKind = "image" | "pdf" | "video" | "audio" | "other";

function kindOf(mimeType: string): FileKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "other";
}

const KIND_FILTERS: { key: FileKind | "all"; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "image", label: "Bilder" },
  { key: "pdf", label: "PDF" },
  { key: "video", label: "Videos" },
  { key: "audio", label: "Audio" },
  { key: "other", label: "Sonstige" },
];

type SortKey = "date" | "name" | "size";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Neueste zuerst" },
  { key: "name", label: "Name (A–Z)" },
  { key: "size", label: "Größe (absteigend)" },
];

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const kind = kindOf(mimeType);
  const cls = cn("size-5", className);
  if (kind === "image") return <ImageIcon className={cn(cls, "text-blue-400")} />;
  if (kind === "video") return <Film className={cn(cls, "text-purple-400")} />;
  if (kind === "audio") return <Music className={cn(cls, "text-green-400")} />;
  if (kind === "pdf") return <FileText className={cn(cls, "text-red-400")} />;
  if (mimeType.includes("zip")) return <Archive className={cn(cls, "text-yellow-400")} />;
  return <FileText className={cn(cls, "text-muted-fg")} />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function DriveClient({
  files,
  ownUserId,
  usedBytes,
  ownFileCount,
  limitBytes,
  query,
}: {
  files: DriveFile[];
  ownUserId: string;
  usedBytes: number;
  ownFileCount: number;
  limitBytes: number;
  query: string;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [kind, setKind] = useState<FileKind | "all">("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [search, setSearch] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const filtered = kind === "all" ? files : files.filter((f) => kindOf(f.mimeType) === kind);
    const sorted = [...filtered];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "de"));
    else if (sort === "size") sorted.sort((a, b) => b.size - a.size);
    // "date": Server liefert bereits createdAt desc
    return sorted;
  }, [files, kind, sort]);

  const usedPercent = Math.min(100, (usedBytes / limitBytes) * 100);

  function submitSearch(value: string) {
    const q = value.trim().slice(0, 100);
    router.push(q ? `/app/drive?q=${encodeURIComponent(q)}` : "/app/drive");
  }

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
    router.refresh();
  }

  async function deleteFile(id: string, name: string) {
    if (!confirm(`"${name}" wirklich löschen?`)) return;
    try {
      const res = await fetch(`/api/drive/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setError("Löschen fehlgeschlagen");
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Drive</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
          <HardDrive className="size-8 text-brand" strokeWidth={1.5} />
          Meine Dateien
        </h1>
        <p className="mt-1 text-sm text-muted-fg">{files.length} Dateien sichtbar</p>
      </header>

      {/* Speicher-Nutzung */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">Speicherplatz</p>
          <p className="text-xs text-muted-fg">
            {formatBytes(usedBytes)} von {formatBytes(limitBytes)} belegt · {ownFileCount}{" "}
            {ownFileCount === 1 ? "eigene Datei" : "eigene Dateien"}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              usedPercent >= 90 ? "bg-danger" : usedPercent >= 70 ? "bg-yellow-500" : "bg-brand"
            )}
            style={{ width: `${Math.max(usedPercent, usedBytes > 0 ? 1 : 0)}%` }}
          />
        </div>
      </div>

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

      {/* Suche + Filter + Sortierung */}
      <div className="flex flex-col gap-3">
        <form
          className="relative"
          onSubmit={(e) => { e.preventDefault(); submitSearch(search); }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-fg" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dateien durchsuchen…"
            maxLength={100}
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-4 text-sm outline-none transition-colors focus:border-brand"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setKind(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                kind === f.key
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-surface text-muted-fg hover:text-fg"
              )}
            >
              {f.label}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="ml-auto rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-fg outline-none"
            aria-label="Sortierung"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* File list */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-fg">
          <HardDrive className="size-10" strokeWidth={1.5} />
          <p className="text-sm">
            {query || kind !== "all" ? "Keine Dateien gefunden" : "Noch keine Dateien hochgeladen"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border">
          {visible.map((f) => (
            <div key={f.id} className="flex items-center gap-4 px-5 py-3.5">
              {kindOf(f.mimeType) === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/drive/download/${f.id}`}
                  alt=""
                  loading="lazy"
                  className="size-10 shrink-0 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileIcon mimeType={f.mimeType} />
                </div>
              )}
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
              {f.userId === ownUserId && (
                <button
                  onClick={() => void deleteFile(f.id, f.name)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger"
                  title="Löschen"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
