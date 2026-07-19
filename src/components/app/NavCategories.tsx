/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveNavLayout } from "@/app/actions/nav-layout";
import type { NavOverride } from "@/lib/nav-categories";

export interface NavCatItem {
  href: string;
  label: string;
}

export interface NavCat {
  id: string;
  label: string;
  collapsed: boolean;
  items: NavCatItem[];
}

interface Props {
  categories: NavCat[];
  /** Rendert einen einzelnen Reiter (Link/Button) — kommt vom Aufrufer. */
  renderItem: (item: NavCatItem) => React.ReactNode;
  /** Kompaktere Abstände (mobiles „Mehr"-Menü). */
  dense?: boolean;
}

/** Wie lange gedrückt halten, bis der Reiter „aufgenommen" wird. */
const LONG_PRESS_MS = 350;

/**
 * Navigations-Kategorien mit:
 * - kleiner, grauer Kategorie-Überschrift
 * - Auf-/Zuklappen (wie bei Discord)
 * - Umbenennen der Überschrift
 * - Verschieben der Reiter per Gedrückt-Halten (Maus **und** Touch)
 *
 * Änderungen werden gebündelt im Nutzerprofil gespeichert.
 */
export function NavCategories({ categories, renderItem, dense = false }: Props) {
  const [cats, setCats] = useState<NavCat[]>(categories);
  const [dragging, setDragging] = useState<{ cat: string; href: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  // Sobald der Nutzer selbst etwas geändert hat, gewinnt der lokale Stand.
  // Sonst würde beim Navigieren der (noch alte) Server-Stand die eigene
  // Sortierung sichtbar zurückspringen lassen.
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setCats(categories);
  }, [categories]);

  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Speichert gebündelt (debounced), damit Drag&Drop nicht bei jedem Pixel schreibt. */
  const persist = useCallback((next: NavCat[]) => {
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const override: NavOverride = {
        order: next.map((c) => c.id),
        names: Object.fromEntries(next.map((c) => [c.id, c.label])),
        collapsed: next.filter((c) => c.collapsed).map((c) => c.id),
        items: Object.fromEntries(next.map((c) => [c.id, c.items.map((i) => i.href)])),
      };
      saveNavLayout(override).catch(() => undefined);
    }, 600);
  }, []);

  const update = useCallback(
    (next: NavCat[]) => {
      setCats(next);
      persist(next);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (longPress.current) clearTimeout(longPress.current);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function toggleCollapse(id: string) {
    update(cats.map((c) => (c.id === id ? { ...c, collapsed: !c.collapsed } : c)));
  }

  function rename(id: string, label: string) {
    const clean = label.trim().slice(0, 40);
    if (clean) update(cats.map((c) => (c.id === id ? { ...c, label: clean } : c)));
    setRenaming(null);
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  function startLongPress(catId: string, href: string) {
    if (longPress.current) clearTimeout(longPress.current);
    longPress.current = setTimeout(() => {
      setDragging({ cat: catId, href });
      // Kurzes haptisches Feedback auf Geräten, die es unterstützen.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(15);
      }
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPress.current) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  }

  /** Reiter über einem anderen loslassen → dorthin einsortieren. */
  function moveOver(targetCat: string, targetHref: string) {
    if (!dragging) return;
    if (dragging.cat === targetCat && dragging.href === targetHref) return;

    const next = cats.map((c) => ({ ...c, items: [...c.items] }));
    const from = next.find((c) => c.id === dragging.cat);
    const to = next.find((c) => c.id === targetCat);
    if (!from || !to) return;

    const fromIdx = from.items.findIndex((i) => i.href === dragging.href);
    if (fromIdx < 0) return;
    const [moved] = from.items.splice(fromIdx, 1);

    const toIdx = to.items.findIndex((i) => i.href === targetHref);
    to.items.splice(toIdx < 0 ? to.items.length : toIdx, 0, moved);

    setCats(next);
    setDragging({ cat: targetCat, href: dragging.href });
  }

  function endDrag() {
    cancelLongPress();
    if (dragging) {
      persist(cats);
      setDragging(null);
    }
  }

  const isDragging = !!dragging;

  const wrapCls = useMemo(
    () => cn("flex flex-col", dense ? "gap-3" : "gap-4"),
    [dense],
  );

  return (
    <div className={wrapCls} onPointerUp={endDrag} onPointerCancel={endDrag}>
      {cats.map((cat) => (
        <div key={cat.id}>
          {/* Kategorie-Überschrift: klein, grau, klappbar, umbenennbar */}
          <div className="group/cat mb-1 flex items-center gap-1 px-3">
            {renaming === cat.id ? (
              <input
                autoFocus
                defaultValue={cat.label}
                onBlur={(e) => rename(cat.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename(cat.id, e.currentTarget.value);
                  if (e.key === "Escape") setRenaming(null);
                }}
                maxLength={40}
                aria-label="Kategorie umbenennen"
                className="w-full rounded-md border border-brand/40 bg-bg px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-fg outline-none"
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => toggleCollapse(cat.id)}
                  aria-expanded={!cat.collapsed}
                  className="flex min-w-0 flex-1 items-center gap-1 text-left"
                >
                  <ChevronDown
                    className={cn(
                      "size-3 shrink-0 text-muted-fg transition-transform duration-200",
                      cat.collapsed && "-rotate-90",
                    )}
                  />
                  <span className="truncate text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
                    {cat.label}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(cat.id)}
                  title="Kategorie umbenennen"
                  aria-label={`Kategorie ${cat.label} umbenennen`}
                  className="shrink-0 rounded p-0.5 text-muted-fg opacity-0 transition-opacity hover:text-fg focus-visible:opacity-100 group-hover/cat:opacity-100"
                >
                  <Pencil className="size-3" />
                </button>
              </>
            )}
          </div>

          {/* Reiter */}
          {!cat.collapsed && (
            <ul className="space-y-0.5">
              {cat.items.map((item) => {
                const active = dragging?.href === item.href;
                return (
                  <li
                    key={item.href}
                    onPointerDown={() => startLongPress(cat.id, item.href)}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onPointerEnter={() => isDragging && moveOver(cat.id, item.href)}
                    className={cn(
                      "transition-transform duration-150",
                      // Aufgenommen: größer + hervorgehoben → signalisiert „verschiebbar"
                      active && "scale-[1.06] rounded-xl bg-brand/10 shadow-md",
                      isDragging && !active && "opacity-70",
                    )}
                    style={isDragging ? { touchAction: "none" } : undefined}
                  >
                    {renderItem(item)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
