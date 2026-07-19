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
 * Umsetzung des Ziehens: Beim Long-Press wird der Pointer am Start-Element
 * eingefangen (setPointerCapture) — dadurch kommen ALLE Bewegungen dort an,
 * auch bei Touch. Das Ziel unter dem Finger/Cursor wird per elementFromPoint
 * ermittelt; `onPointerEnter` der Nachbarn wäre bei Touch nie gefeuert.
 */
export function NavCategories({ categories, renderItem, dense = false }: Props) {
  const [cats, setCats] = useState<NavCat[]>(categories);
  const [dragging, setDragging] = useState<{ cat: string; href: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  // Sobald der Nutzer selbst etwas geändert hat, gewinnt der lokale Stand.
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setCats(categories);
  }, [categories]);

  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Verhindert, dass direkt nach dem Ziehen der Link geöffnet wird. */
  const justDragged = useRef(false);

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

  // Während des Ziehens das Scrollen per Touch unterdrücken. Muss passive:false
  // sein, sonst lässt sich preventDefault nicht anwenden.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

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

  // ── Ziehen ────────────────────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent<HTMLLIElement>, catId: string, href: string) {
    // Nur linke Maustaste / Touch / Stift
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const pointerId = e.pointerId;

    if (longPress.current) clearTimeout(longPress.current);
    longPress.current = setTimeout(() => {
      draggingRef.current = true;
      setDragging({ cat: catId, href });
      // Pointer einfangen → alle weiteren Bewegungen landen hier,
      // auch wenn der Finger/Cursor andere Elemente überstreicht.
      try {
        el.setPointerCapture(pointerId);
      } catch {
        /* ältere Browser: dann greift der Fallback über elementFromPoint */
      }
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(15);
      }
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: React.PointerEvent<HTMLLIElement>) {
    if (!draggingRef.current) {
      // Vor dem Long-Press: kleine Bewegung = Scrollen/Klicken → abbrechen
      return;
    }
    e.preventDefault();

    // Element unter Finger/Cursor bestimmen (funktioniert auch mit Capture).
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const target = under?.closest<HTMLElement>("[data-nav-href]");
    if (!target) return;
    const targetHref = target.dataset.navHref;
    const targetCat = target.dataset.navCat;
    if (targetHref && targetCat) moveOver(targetCat, targetHref);
  }

  /** Gezogenen Reiter vor dem Ziel einsortieren (auch kategorieübergreifend). */
  function moveOver(targetCat: string, targetHref: string) {
    setDragging((cur) => {
      if (!cur) return cur;
      if (cur.cat === targetCat && cur.href === targetHref) return cur;

      setCats((prev) => {
        const next = prev.map((c) => ({ ...c, items: [...c.items] }));
        const from = next.find((c) => c.id === cur.cat);
        const to = next.find((c) => c.id === targetCat);
        if (!from || !to) return prev;

        const fromIdx = from.items.findIndex((i) => i.href === cur.href);
        if (fromIdx < 0) return prev;
        const [moved] = from.items.splice(fromIdx, 1);

        const toIdx = to.items.findIndex((i) => i.href === targetHref);
        to.items.splice(toIdx < 0 ? to.items.length : toIdx, 0, moved);
        return next;
      });

      return { cat: targetCat, href: cur.href };
    });
  }

  function endDrag() {
    if (longPress.current) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
    if (draggingRef.current) {
      draggingRef.current = false;
      justDragged.current = true;
      // Klick, der unmittelbar auf das Loslassen folgt, verwerfen.
      setTimeout(() => {
        justDragged.current = false;
      }, 250);
      setDragging(null);
      // aktuellen Stand sichern
      setCats((cur) => {
        persist(cur);
        return cur;
      });
    }
  }

  const isDragging = !!dragging;

  const wrapCls = useMemo(
    () => cn("flex flex-col", dense ? "gap-3" : "gap-4", isDragging && "select-none"),
    [dense, isDragging],
  );

  return (
    <div
      ref={rootRef}
      className={wrapCls}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
    >
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
                    data-nav-href={item.href}
                    data-nav-cat={cat.id}
                    onPointerDown={(e) => onPointerDown(e, cat.id, item.href)}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    // Verhindert, dass der Browser den Link selbst „wegzieht"
                    // (natives Drag&Drop) und dabei die Pointer-Events schluckt.
                    // dragstart blubbert vom <a> hoch und wird hier gestoppt.
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    // Nach dem Ziehen nicht zur Seite navigieren.
                    onClickCapture={(e) => {
                      if (justDragged.current) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    className={cn(
                      "transition-transform duration-150",
                      active && "z-10 scale-[1.06] rounded-xl bg-brand/10 shadow-lg",
                      isDragging && !active && "opacity-60",
                      isDragging && "cursor-grabbing",
                    )}
                    style={{ touchAction: isDragging ? "none" : "manipulation" }}
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
