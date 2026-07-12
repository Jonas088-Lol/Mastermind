/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "standard", label: "Standard",   sample: "Aa",  detail: "Normale Schriftgröße" },
  { value: "large",    label: "Groß",        sample: "Aa",  detail: "+12 % — für bessere Lesbarkeit" },
  { value: "xlarge",   label: "Sehr groß",   sample: "Aa",  detail: "+25 % — maximale Lesbarkeit" },
] as const;

type FontSize = "standard" | "large" | "xlarge";

export function FontSizePicker() {
  const [size, setSize] = useState<FontSize>(() => {
    if (typeof window === "undefined") return "standard";
    try {
      const raw = localStorage.getItem("mm_display_prefs");
      if (raw) {
        const prefs = JSON.parse(raw) as Record<string, unknown>;
        const stored = prefs.font_size as FontSize | undefined;
        if (stored && ["standard", "large", "xlarge"].includes(stored)) return stored;
      }
    } catch {}
    return "standard";
  });

  function pick(v: FontSize) {
    setSize(v);
    try {
      const raw = localStorage.getItem("mm_display_prefs");
      const prefs = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      prefs.font_size = v;
      localStorage.setItem("mm_display_prefs", JSON.stringify(prefs));
      // Apply immediately without page reload
      const html = document.documentElement;
      if (v === "standard") html.removeAttribute("data-font-size");
      else html.setAttribute("data-font-size", v);
    } catch {}
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => pick(opt.value)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-3 transition-colors",
            size === opt.value
              ? "border-brand bg-brand/8 text-brand"
              : "border-border bg-bg text-muted-fg hover:border-brand/50",
          )}
        >
          <span
            className="font-bold leading-none"
            style={{
              fontSize:
                opt.value === "standard" ? "1.25rem" :
                opt.value === "large"    ? "1.5rem"  : "1.75rem",
            }}
          >
            {opt.sample}
          </span>
          <span className="text-xs font-semibold">{opt.label}</span>
          <span className="text-[10px] text-center leading-tight opacity-70">{opt.detail}</span>
        </button>
      ))}
    </div>
  );
}
