/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hexToHsl, contrastFg } from "@/lib/hex-to-hsl";
import { SCREENS, SCREEN_COMPONENTS, type ScreenId } from "@/components/landing/DashboardPreviewModal";
import { ColorField } from "./ColorField";

/**
 * „Vorschau-Ansicht" (Expertenmodus des Brandings).
 *
 * Zeigt die App-Vorschau der Startseite in einem Pop-up und lässt die Farben
 * daneben live einstellen — die Vorschau übernimmt sie sofort, weil die
 * Theme-Variablen auf dem Vorschau-Container gesetzt werden.
 */
export function BrandingPreviewModal({
  open,
  onClose,
  accent, setAccent,
  secondary, setSecondary,
  bgLight, setBgLight,
  bgDark, setBgDark,
}: {
  open: boolean;
  onClose: () => void;
  accent: string; setAccent: (v: string) => void;
  secondary: string; setSecondary: (v: string) => void;
  bgLight: string; setBgLight: (v: string) => void;
  bgDark: string; setBgDark: (v: string) => void;
}) {
  const [screen, setScreen] = useState<ScreenId>("dashboard");
  const [screenMenu, setScreenMenu] = useState(false);
  /** Welcher Hintergrund gerade bearbeitet wird. */
  const [bgMode, setBgMode] = useState<"light" | "dark">("light");
  const [bgMenu, setBgMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Escape schließt, Body-Scroll sperren.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  // Klick außerhalb schließt die Auswahlmenüs.
  useEffect(() => {
    if (!screenMenu && !bgMenu) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setScreenMenu(false); setBgMenu(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [screenMenu, bgMenu]);

  if (!open) return null;

  const Screen = SCREEN_COMPONENTS[screen];
  const current = SCREENS.find((s) => s.id === screen);

  // Farben als Theme-Variablen — dadurch färbt sich die Vorschau in Echtzeit.
  const brandHsl = hexToHsl(accent);
  const accentHsl = hexToHsl(secondary);
  const previewVars: React.CSSProperties = {
    ...(brandHsl ? { ["--brand" as string]: brandHsl, ["--brand-fg" as string]: contrastFg(accent) } : {}),
    ...(accentHsl ? { ["--accent" as string]: accentHsl, ["--accent-fg" as string]: contrastFg(secondary) } : {}),
    backgroundColor: bgMode === "light" ? bgLight : bgDark,
  };

  /** Runder Haken im In-App-Symboldesign. */
  const CheckDot = () => (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
      <Check className="size-3" strokeWidth={3} />
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative my-auto flex w-full max-w-6xl flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6">
        {/* ── Kopf: Ansichtswahl links, Schließen rechts ─────────────────── */}
        <div className="flex items-start justify-between gap-3" ref={menuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => { setScreenMenu((v) => !v); setBgMenu(false); }}
              aria-expanded={screenMenu}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm font-semibold transition-colors hover:border-brand/40"
            >
              {current?.label ?? "Ansicht"}
              <ChevronDown className={cn("size-4 text-muted-fg transition-transform", screenMenu && "rotate-180")} />
            </button>
            {screenMenu && (
              <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-bg shadow-xl">
                {SCREENS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setScreen(s.id as ScreenId); setScreenMenu(false); }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface",
                      s.id === screen && "font-semibold",
                    )}
                  >
                    {s.label}
                    {s.id === screen && <CheckDot />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Vorschau-Ansicht schließen"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-fg transition-colors hover:bg-bg hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── App-Vorschau (übernimmt die Farben live) ───────────────────── */}
        <div
          className={cn("overflow-hidden rounded-xl border border-border", bgMode === "dark" && "dark")}
          style={previewVars}
        >
          <div className="max-h-[46vh] overflow-y-auto p-3">
            <Screen />
          </div>
        </div>

        {/* ── Farbeinstellungen ─────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg p-4">
            <p className="mb-3 text-center text-sm font-semibold">Primärfarbe</p>
            <ColorField value={accent} onChange={setAccent} compact />
          </div>

          <div className="rounded-xl border border-border bg-bg p-4">
            <p className="mb-3 text-center text-sm font-semibold">Sekundärfarbe</p>
            <ColorField value={secondary} onChange={setSecondary} compact />
          </div>

          <div className="rounded-xl border border-border bg-bg p-4">
            <div className="mb-3 flex items-center justify-center gap-2">
              <p className="text-sm font-semibold">Hintergrund</p>
              {/* Umschalter hell/dunkel — gleiche Logik wie die Ansichtswahl */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setBgMenu((v) => !v); setScreenMenu(false); }}
                  aria-expanded={bgMenu}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1 text-xs font-semibold transition-colors hover:border-brand/40"
                >
                  {bgMode === "light" ? "Hell" : "Dunkel"}
                  <ChevronDown className={cn("size-3.5 text-muted-fg transition-transform", bgMenu && "rotate-180")} />
                </button>
                {bgMenu && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-bg shadow-xl">
                    {(["light", "dark"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setBgMode(m); setBgMenu(false); }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface",
                          m === bgMode && "font-semibold",
                        )}
                      >
                        {m === "light" ? "Heller Hintergrund" : "Dunkler Hintergrund"}
                        {m === bgMode && <CheckDot />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <ColorField
              value={bgMode === "light" ? bgLight : bgDark}
              onChange={bgMode === "light" ? setBgLight : setBgDark}
              compact
            />
          </div>
        </div>

        {/* ── Schließen ─────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onClose}
          className="pastel-cta mx-auto w-full rounded-xl px-5 py-3 text-sm font-bold sm:w-auto"
        >
          Vorschau-Ansicht schließen
        </button>
      </div>
    </div>
  );
}
