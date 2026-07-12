/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import { ARTICLE_COLORS, KATEGORIEN } from "./colors";

/**
 * Artikel-Formular der Schülerzeitung — "leicht designbar":
 * Akzentfarbe + optionales Titelbild, mit Live-Vorschau der Karte.
 */
interface Props {
  action: (formData: FormData) => void;
  initial?: { title: string; subtitle: string | null; content: string; color: string | null; coverUrl: string | null; category: string | null };
  submitLabel: string;
}

export function ArticleForm({ action, initial, submitLabel }: Props) {
  const [color, setColor] = useState(initial?.color ?? ARTICLE_COLORS[0]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Titel *</label>
        <input id="title" name="title" required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Das große Sommerfest — ein Rückblick"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-base font-semibold focus:border-brand focus:outline-none" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="subtitle" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Untertitel (optional)</label>
        <input id="subtitle" name="subtitle" maxLength={250} defaultValue={initial?.subtitle ?? ""}
          placeholder="Kurzer Teaser unter dem Titel"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Rubrik</span>
        <div className="flex flex-wrap gap-2">
          {KATEGORIEN.map((k) => (
            <button key={k.value} type="button"
              onClick={() => setCategory(category === k.value ? "" : k.value)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === k.value ? "border-brand bg-brand text-brand-fg" : "border-border bg-bg text-muted-fg hover:text-fg"
              }`}>
              {k.emoji} {k.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={category} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Akzentfarbe</span>
          <div className="flex flex-wrap items-center gap-2">
            {ARTICLE_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Farbe ${c}`}
                className="size-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: color === c ? "hsl(var(--fg))" : "transparent" }} />
            ))}
          </div>
          <input type="hidden" name="color" value={color} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="coverUrl" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Titelbild-URL (optional)</label>
          <input id="coverUrl" name="coverUrl" type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://… oder /uploads/…"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
        </div>
      </div>

      {/* Live-Vorschau der Artikelkarte */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Vorschau</span>
        <div className="max-w-sm overflow-hidden rounded-2xl border border-border bg-surface">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-28 w-full object-cover" />
          ) : (
            <div className="h-12 w-full" style={{ background: `linear-gradient(120deg, ${color}33, ${color}0d)` }} />
          )}
          <div className="p-4" style={{ borderTop: `3px solid ${color}` }}>
            <p className="font-bold leading-snug">{title || "Dein Titel"}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="content" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Artikeltext *</label>
        <textarea id="content" name="content" required rows={14} maxLength={20000} defaultValue={initial?.content ?? ""}
          placeholder={"Schreib deinen Artikel…\n\nAbsätze trennst du mit einer Leerzeile."}
          className="resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-sm leading-relaxed focus:border-brand focus:outline-none" />
      </div>

      <button type="submit"
        className="w-fit rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-brand-fg transition-all hover:brightness-105 active:scale-95">
        {submitLabel}
      </button>
    </form>
  );
}
