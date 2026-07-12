/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";

interface Props {
  action: (formData: FormData) => Promise<void>;
}

export function NotizenNeuForm({ action }: Props) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<{ filename: string; preview: string }[]>([]);

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/notes", { method: "POST", body: fd });
    if (res.ok) {
      const data = (await res.json()) as { filename: string };
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { filename: data.filename, preview }]);
    }
    setUploading(false);
    e.target.value = "";
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
          Titel *
        </label>
        <input
          id="title" name="title" type="text" required
          placeholder="z. B. pq-Formel — alle Sonderfälle"
          className="border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="content" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
          Inhalt *
        </label>
        <textarea
          id="content" name="content" required rows={10}
          placeholder="Schreibe hier deine Notiz…"
          className="border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
          Bilder (optional, max. 5 MB je Bild)
        </p>
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.filename} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt="Vorschau" className="size-20 border border-border object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((i) => i.filename !== img.filename))}
                className="absolute -right-1 -top-1 grid size-5 place-items-center bg-danger text-white"
              >
                <X className="size-3" />
              </button>
              <input type="hidden" name="imageFilename" value={img.filename} />
            </div>
          ))}
          <label className="grid size-20 cursor-pointer place-items-center border border-dashed border-border bg-surface text-muted-fg hover:border-brand hover:text-brand">
            {uploading ? (
              <span className="text-[10px]">…</span>
            ) : (
              <ImagePlus className="size-5" />
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={handleImagePick} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input id="isPublic" name="isPublic" type="checkbox" defaultChecked className="size-4 accent-brand" />
        <label htmlFor="isPublic" className="text-sm font-medium">
          Öffentlich teilen (sichtbar für alle Schüler)
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="border border-transparent bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-fg/90"
        >
          Notiz veröffentlichen
        </button>
      </div>
    </form>
  );
}
