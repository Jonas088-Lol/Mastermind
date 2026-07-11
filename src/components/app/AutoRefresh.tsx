"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Hält Server-gerenderte Seiten live, ohne dass der Nutzer neu laden muss.
 *
 * - Pollt per router.refresh() im Intervall (Server Components werden neu
 *   gerendert, Client-State/Scroll bleiben erhalten — kein Full-Reload).
 * - Refresht zusätzlich sofort, wenn der Tab wieder sichtbar/fokussiert wird.
 * - Pausiert im Hintergrund-Tab (spart Server-Last und Akku).
 *
 * Einfach in jede Seite legen, die sich von selbst aktualisieren soll:
 *   <AutoRefresh seconds={5} />
 */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = Math.max(2, seconds) * 1000;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, interval);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router, seconds]);

  return null;
}
