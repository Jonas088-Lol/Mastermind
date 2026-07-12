/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { Eye, Minus, Plus, ZoomIn } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface AccessibilitySettings {
  fontSize: "sm" | "base" | "lg" | "xl";
  highContrast: boolean;
}

interface Props {
  settings: AccessibilitySettings;
  onChange: (s: AccessibilitySettings) => void;
  className?: string;
}

const SIZES: AccessibilitySettings["fontSize"][] = ["sm", "base", "lg", "xl"];
const SIZE_LABELS: Record<string, string> = { sm: "Klein", base: "Normal", lg: "Groß", xl: "Sehr groß" };

export function WorksheetAccessibilityToolbar({ settings, onChange, className }: Props) {
  const [open, setOpen] = useState(false);

  function cycleFontUp() {
    const idx = SIZES.indexOf(settings.fontSize);
    if (idx < SIZES.length - 1) onChange({ ...settings, fontSize: SIZES[idx + 1] });
  }

  function cycleFontDown() {
    const idx = SIZES.indexOf(settings.fontSize);
    if (idx > 0) onChange({ ...settings, fontSize: SIZES[idx - 1] });
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center border border-border bg-bg text-muted-fg transition-colors hover:border-brand/40 hover:text-brand"
        title="Darstellungsoptionen"
        aria-label="Darstellungsoptionen"
      >
        <Eye className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 border border-border bg-bg shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Darstellung</p>
          </div>

          <div className="p-3 space-y-3">
            {/* Font size */}
            <div>
              <p className="mb-1.5 text-xs text-muted-fg">Schriftgröße: {SIZE_LABELS[settings.fontSize]}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={cycleFontDown}
                  disabled={settings.fontSize === "sm"}
                  className="grid size-8 place-items-center border border-border bg-bg text-muted-fg transition-colors hover:bg-surface disabled:opacity-30"
                  aria-label="Schrift kleiner"
                >
                  <Minus className="size-3.5" />
                </button>
                <div className="flex flex-1 gap-1">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => onChange({ ...settings, fontSize: s })}
                      className={cn(
                        "flex-1 py-1 text-[10px] font-semibold transition-colors",
                        settings.fontSize === s
                          ? "bg-brand text-brand-fg"
                          : "border border-border bg-bg text-muted-fg hover:bg-surface"
                      )}
                    >
                      {SIZE_LABELS[s][0]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={cycleFontUp}
                  disabled={settings.fontSize === "xl"}
                  className="grid size-8 place-items-center border border-border bg-bg text-muted-fg transition-colors hover:bg-surface disabled:opacity-30"
                  aria-label="Schrift größer"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>

            {/* High contrast */}
            <div className="flex items-center justify-between">
              <label htmlFor="ws-contrast" className="flex items-center gap-2 cursor-pointer">
                <ZoomIn className="size-4 text-muted-fg" />
                <span className="text-sm">Hoher Kontrast</span>
              </label>
              <button
                id="ws-contrast"
                role="switch"
                aria-checked={settings.highContrast}
                onClick={() => onChange({ ...settings, highContrast: !settings.highContrast })}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  settings.highContrast ? "bg-brand" : "bg-border"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform",
                    settings.highContrast ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
