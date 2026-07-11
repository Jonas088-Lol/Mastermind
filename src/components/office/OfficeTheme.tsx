"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Moon, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Darstellungs-Umschalter für die Office-Editoren (Word, Excel, Präsentationen, Heft).
 *
 * Modi:
 *  - auto:  folgt dem App-Theme (dunkel → Menü dunkel + Blatt gedimmt)
 *  - light: alles hell
 *  - dark:  Menüleiste dunkel + Blatt gedimmt
 *  - menu:  nur Menüleiste dunkel, Blatt bleibt voll weiß
 *  - paper: nur Blatt gedimmt, Menüleiste bleibt hell
 *
 * Die Wahl wird in localStorage gespeichert und gilt für alle Office-Editoren.
 * Umsetzung über die Klassen office-dark-shell / office-dim-page (globals.css).
 */

export type OfficeThemeMode = "auto" | "light" | "dark" | "menu" | "paper";

const STORAGE_KEY = "mm-office-theme";

const OPTIONS: { value: OfficeThemeMode; label: string; hint: string }[] = [
  { value: "auto",  label: "Automatisch",          hint: "folgt dem App-Design" },
  { value: "light", label: "Hell",                  hint: "alles hell" },
  { value: "dark",  label: "Dunkel",                hint: "Menü dunkel, Blatt gedimmt" },
  { value: "menu",  label: "Nur Menü dunkel",       hint: "Blatt bleibt weiß" },
  { value: "paper", label: "Nur Blatt gedimmt",     hint: "Menü bleibt hell" },
];

export function useOfficeTheme() {
  const [mode, setModeState] = useState<OfficeThemeMode>("auto");
  const [appDark, setAppDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as OfficeThemeMode | null;
    if (saved && OPTIONS.some((o) => o.value === saved)) setModeState(saved);
    const root = document.documentElement;
    const update = () => setAppDark(root.getAttribute("data-theme") === "dark");
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  function setMode(m: OfficeThemeMode) {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* private mode */ }
  }

  const effective = mode === "auto" ? (appDark ? "dark" : "light") : mode;
  const officeClasses = cn(
    (effective === "dark" || effective === "menu") && "office-dark-shell",
    (effective === "dark" || effective === "paper") && "office-dim-page",
  );

  return { mode, setMode, officeClasses };
}

export function OfficeThemeMenu({ mode, setMode }: { mode: OfficeThemeMode; setMode: (m: OfficeThemeMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const Icon = mode === "light" ? Sun : mode === "auto" ? SunMoon : Moon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Darstellung"
        className="flex h-7 items-center gap-1 rounded border border-gray-200 px-1.5 text-gray-500 hover:bg-gray-50"
      >
        <Icon className="size-3.5" strokeWidth={1.75} />
        <ChevronDown className="size-2.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-100 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { setMode(o.value); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50"
            >
              <span className="grid size-4 place-items-center">
                {mode === o.value && <Check className="size-3 text-brand" strokeWidth={2.5} />}
              </span>
              <span className="flex-1">
                <span className={cn("block text-xs", mode === o.value ? "font-semibold text-brand" : "text-gray-700")}>{o.label}</span>
                <span className="block text-[10px] text-gray-400">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
