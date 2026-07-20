/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

const SEEN_KEY = "mm-update-seen";

/**
 * Einmaliges „Was ist neu"-Popup beim App-Öffnen. Welche Veröffentlichung
 * schon gesehen wurde, merkt sich der Client per localStorage (Update-id).
 */
export function PlatformUpdatePopup({
  id,
  title,
  body,
  publishedAt,
}: {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) !== id) setOpen(true);
    } catch {
      // localStorage gesperrt (z. B. Private Mode) — dann lieber kein Popup-Loop
    }
  }, [id]);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, id);
    } catch {}
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-popup-title"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md border border-border bg-bg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-brand">
            <Sparkles className="size-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Neues Update</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Schließen"
            className="text-muted-fg transition-colors hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 id="update-popup-title" className="mt-3 text-xl font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-xs text-muted-fg">
          {new Date(publishedAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
        <div className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6">
          {body}
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mt-6 inline-flex h-10 w-full items-center justify-center bg-brand text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
        >
          Alles klar!
        </button>
      </div>
    </div>
  );
}
