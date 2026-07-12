/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect } from "react";

export function DisplayPrefsApplier() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_display_prefs");
      if (!raw) return;
      const prefs = JSON.parse(raw) as Record<string, unknown>;

      const html = document.documentElement;

      // Reduced motion
      if (prefs.reduced_motion) {
        html.setAttribute("data-reduced-motion", "true");
      } else {
        html.removeAttribute("data-reduced-motion");
      }

      // Font size: "standard" | "large" | "xlarge"
      const size = prefs.font_size as string | undefined;
      if (size && size !== "standard") {
        html.setAttribute("data-font-size", size);
      } else {
        html.removeAttribute("data-font-size");
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  return null;
}
