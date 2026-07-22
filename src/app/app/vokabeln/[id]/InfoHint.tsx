/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * Kleines „i"-Symbol im In-App-Symboldesign mit Kurzinfo.
 *
 * Desktop: Hinweis erscheint beim Hovern. Mobil: Antippen schaltet ihn um —
 * reines CSS-`hover` reagiert auf Touch-Geräten nicht zuverlässig, deshalb
 * eine winzige Client-Komponente.
 */
export function InfoHint({ text, label = "Info" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Tippt man daneben, schließt der Hinweis wieder.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-5 place-items-center rounded-full border border-border bg-surface text-muted-fg transition-colors hover:border-brand/40 hover:text-brand"
      >
        <Info className="size-3" strokeWidth={2} />
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-bg px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed text-fg shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  );
}
