"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// ── Page → human-readable activity mapping ────────────────────────────────

const PAGE_ACTIVITIES: [string, string][] = [
  ["/app/tutor", "Fragt den KI-Tutor"],
  ["/app/karteikarten", "Lernt Karteikarten"],
  ["/app/uebungen", "Macht Übungen"],
  ["/app/heft", "Schreibt im digitalen Heft"],
  ["/app/vokabeln", "Übt Vokabeln"],
  ["/app/aufgaben", "Bearbeitet Aufgaben"],
  ["/app/lernen", "Erkundet Lernpfade"],
  ["/app/arbeitsblatter", "Bearbeitet Arbeitsblätter"],
  ["/app/noten", "Schaut Noten an"],
  ["/app/plan", "Schaut Stundenplan"],
  ["/app/nachrichten", "Liest Nachrichten"],
  ["/app/masterspace", "Chattet in MasterSpace"],
  ["/app/duelle", "Spielt Duelle"],
  ["/app/ranking", "Schaut Rangliste"],
  ["/app/quests", "Erledigt Quests"],
  ["/app/shop", "Schaut im Shop"],
  ["/app/community", "Schaut Community"],
  ["/app/erfolge", "Schaut Erfolge"],
  ["/app/profil", "Bearbeitet Profil"],
  ["/app/einstellungen", "In den Einstellungen"],
  ["/app", "Auf dem Dashboard"],
];

function getActivity(pathname: string): string {
  for (const [prefix, label] of PAGE_ACTIVITIES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return label;
  }
  return "Auf MasterMind";
}

// ── Tracker ───────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL = 20_000; // send every 20 s
const IDLE_THRESHOLD = 60_000;     // idle after 60 s without mouse/keyboard
const ACTIVE_TICK = 1;             // seconds to increment per interval when active

export function ActivityTracker({ hasConsent }: { hasConsent: boolean }) {
  const pathname = usePathname();

  // Refs so event handlers always see current values
  const hasConsentRef = useRef(hasConsent);
  const pathnameRef = useRef(pathname);
  const isActiveRef = useRef(false);          // mouse/keyboard in the last idle threshold
  const tabFocusedRef = useRef(!document.hidden);
  const lastActivityRef = useRef(Date.now()); // last mouse/keyboard event
  const tabSwitchesDeltaRef = useRef(0);      // tab switches since last heartbeat
  const activeSecondsDeltaRef = useRef(0);    // active seconds since last heartbeat

  useEffect(() => { hasConsentRef.current = hasConsent; }, [hasConsent]);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    // ── Activity detection ─────────────────────────────────────────

    function onUserActivity() {
      lastActivityRef.current = Date.now();
      isActiveRef.current = true;
    }

    function onVisibilityChange() {
      const hidden = document.hidden;
      if (hidden && tabFocusedRef.current) {
        // Tab going to background = a tab switch
        tabSwitchesDeltaRef.current += 1;
      }
      tabFocusedRef.current = !hidden;
    }

    function onWindowFocus() {
      tabFocusedRef.current = true;
    }

    function onWindowBlur() {
      if (tabFocusedRef.current) tabSwitchesDeltaRef.current += 1;
      tabFocusedRef.current = false;
    }

    // Mouse + keyboard = "active"
    window.addEventListener("mousemove", onUserActivity, { passive: true });
    window.addEventListener("keydown", onUserActivity, { passive: true });
    window.addEventListener("click", onUserActivity, { passive: true });
    window.addEventListener("scroll", onUserActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("blur", onWindowBlur);

    // ── Heartbeat ─────────────────────────────────────────────────

    const heartbeatId = setInterval(async () => {
      // Update idle state
      const now = Date.now();
      if (now - lastActivityRef.current > IDLE_THRESHOLD) {
        isActiveRef.current = false;
      }

      // Accumulate active seconds
      if (isActiveRef.current && tabFocusedRef.current) {
        activeSecondsDeltaRef.current += HEARTBEAT_INTERVAL / 1000;
      }

      const tabSwitches = tabSwitchesDeltaRef.current;
      const activeSeconds = Math.round(activeSecondsDeltaRef.current);

      // Reset deltas before the fetch (avoid double-counting if fetch is slow)
      tabSwitchesDeltaRef.current = 0;
      activeSecondsDeltaRef.current = 0;

      try {
        await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            page: pathnameRef.current,
            activity: getActivity(pathnameRef.current),
            isActive: isActiveRef.current,
            tabFocused: tabFocusedRef.current,
            tabSwitchesDelta: tabSwitches,
            activeSecondsDelta: activeSeconds,
          }),
        });
      } catch {
        // Network error — silently ignore, we'll try next tick
        // Add back the deltas so they're not lost
        tabSwitchesDeltaRef.current += tabSwitches;
        activeSecondsDeltaRef.current += activeSeconds;
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(heartbeatId);
      window.removeEventListener("mousemove", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("click", onUserActivity);
      window.removeEventListener("scroll", onUserActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  // No UI — pure side effect
  return null;
}
