"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, CheckSquare, Flame, Home, Layers, Medal,
  MessageSquare, PencilLine, Search, Settings, ShoppingBag,
  Swords, Target, Timer, Trophy, User, Zap,
} from "lucide-react";

type Entry = {
  label: string;
  sub?: string;
  href?: string;
  action?: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  keywords: string[];
};

const ENTRIES: Entry[] = [
  { label: "Dashboard",        href: "/app",                    icon: Home,          keywords: ["home", "start", "übersicht"] },
  { label: "Hefte",            href: "/app/heft",               icon: PencilLine,    keywords: ["heft", "notiz", "schreiben", "block", "editor"] },
  { label: "Aufgaben",         href: "/app/aufgaben",           icon: CheckSquare,   keywords: ["aufgabe", "hausaufgabe", "abgabe"] },
  { label: "Noten",            href: "/app/noten",              icon: Trophy,        keywords: ["note", "zeugnis"] },
  { label: "Übungen",          href: "/app/uebungen",           icon: Target,        keywords: ["üben", "quiz", "fragen"] },
  { label: "Karteikarten",     href: "/app/karteikarten",       icon: Layers,        keywords: ["karten", "lernen", "spaced repetition"] },
  { label: "Aus PDF lernen",   href: "/app/karteikarten/aus-pdf", icon: Zap,         keywords: ["pdf", "ki", "generieren"] },
  { label: "Lernpfade",        href: "/app/lernen",             icon: BookOpen,      keywords: ["lernpfad", "kurs", "modul"] },
  { label: "Duelle",           href: "/app/duelle",             icon: Swords,        keywords: ["duell", "challenge", "pvp"] },
  { label: "Ranking",          href: "/app/ranking",            icon: Medal,         keywords: ["rangliste", "platz", "klasse"] },
  { label: "Streaks",          href: "/app/streaks",            icon: Flame,         keywords: ["streak", "serie"] },
  { label: "Nachrichten",      href: "/app/nachrichten",        icon: MessageSquare, keywords: ["nachricht", "chat"] },
  { label: "KI-Tutor",         href: "/app/tutor",              icon: Zap,           keywords: ["ki", "tutor", "hilfe", "frage"] },
  { label: "Shop",             href: "/app/shop",               icon: ShoppingBag,   keywords: ["shop", "coins", "kaufen"] },
  { label: "Profil",           href: "/app/profil",             icon: User,          keywords: ["profil", "account"] },
  { label: "Einstellungen",    href: "/app/einstellungen",      icon: Settings,      keywords: ["einstellung", "passwort", "2fa"] },
  { label: "Suche",            href: "/search",                 icon: Search,        keywords: ["suche", "finden"] },
  { label: "Stundenplan",      href: "/app/plan",               icon: BookOpen,      keywords: ["stundenplan", "woche", "heute"] },
  { label: "Erfolge",          href: "/app/erfolge",            icon: Trophy,        keywords: ["achievement", "erfolge", "abzeichen"] },
  { label: "Quests",           href: "/app/quests",             icon: Target,        keywords: ["quest", "aufgabe", "mission"] },
  { label: "Pomodoro-Timer öffnen", icon: Timer, keywords: ["pomodoro", "timer", "fokus", "pause"], action: undefined },
];

function score(entry: Entry, query: string): number {
  const q = query.toLowerCase();
  if (entry.label.toLowerCase().startsWith(q)) return 3;
  if (entry.label.toLowerCase().includes(q)) return 2;
  if (entry.keywords.some((k) => k.includes(q))) return 1;
  return 0;
}

interface CommandPaletteProps {
  onOpenPomodoro: () => void;
}

export function CommandPalette({ onOpenPomodoro }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Wire up the pomodoro action
  const entries: Entry[] = ENTRIES.map((e) =>
    e.label === "Pomodoro-Timer öffnen"
      ? { ...e, action: () => { setOpen(false); onOpenPomodoro(); } }
      : e
  );

  // Filter + sort
  const filtered = query.trim()
    ? entries
        .map((e) => ({ e, s: score(e, query.trim()) }))
        .filter(({ s }) => s > 0)
        .sort((a, b) => b.s - a.s)
        .map(({ e }) => e)
    : entries;

  // Keyboard shortcut to open
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setSelectedIdx(0);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIdx(0);
    }
  }, [open]);

  function navigate(entry: Entry) {
    setOpen(false);
    setQuery("");
    if (entry.action) {
      entry.action();
    } else if (entry.href) {
      startTransition(() => router.push(entry.href!));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIdx]) navigate(filtered[selectedIdx]);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-fg/20 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-1/2 top-1/4 z-50 w-full max-w-lg -translate-x-1/2 shadow-2xl">
        <div className="border border-border bg-bg">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Wohin möchtest du? (Ctrl+K)"
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            <kbd className="hidden border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-fg sm:inline">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <ul className="max-h-80 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-fg">Keine Ergebnisse</li>
            ) : (
              filtered.map((entry, idx) => {
                const Icon = entry.icon;
                return (
                  <li key={entry.label}>
                    <button
                      type="button"
                      onClick={() => navigate(entry)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        idx === selectedIdx ? "bg-surface" : ""
                      }`}
                    >
                      <span className={`grid size-7 shrink-0 place-items-center border ${
                        idx === selectedIdx ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-fg"
                      }`}>
                        <Icon className="size-3.5" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{entry.label}</p>
                        {entry.sub && (
                          <p className="truncate text-xs text-muted-fg">{entry.sub}</p>
                        )}
                      </div>
                      {idx === selectedIdx && (
                        <kbd className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-fg">
                          ↵
                        </kbd>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-border px-4 py-2">
            <p className="text-[10px] text-muted-fg">
              ↑↓ navigieren · Enter öffnen · Esc schließen · Ctrl+K überall
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
