/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * App-weites Preloading für Instant-Navigation.
 *
 * Sobald der Nutzer Eingabe-Absicht zeigt — Maus über einem Link (hover),
 * Finger berührt den Bildschirm (touchstart) oder Maustaste gedrückt
 * (mousedown, feuert vor click) — wird die Zielseite sofort per
 * router.prefetch() vom Server vorbereitet. Beim tatsächlichen Klick ist die
 * Antwort dann meist schon da → Ladezeit nahe 0.
 *
 * Bereits vorgeladene Ziele werden übersprungen (Set), damit der Server
 * nicht mit Duplikaten geflutet wird.
 */
export function SpeedBoost() {
  const router = useRouter();
  const prefetched = useRef<Set<string>>(new Set());

  useEffect(() => {
    const prefetchTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;
      const a = target.closest<HTMLAnchorElement>("a[href^='/']");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("/api/")) return;
      if (prefetched.current.has(href)) return;
      prefetched.current.add(href);
      try { router.prefetch(href); } catch { /* nie den Klick blockieren */ }
    };

    const onPointerOver = (e: PointerEvent) => prefetchTarget(e.target);
    const onTouchStart = (e: TouchEvent) => prefetchTarget(e.target);
    const onMouseDown = (e: MouseEvent) => prefetchTarget(e.target);

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("mousedown", onMouseDown, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [router]);

  return null;
}
