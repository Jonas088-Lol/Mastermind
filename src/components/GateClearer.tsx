"use client";

import { useEffect } from "react";
import { GATE_COOKIE } from "@/lib/gate";

// Clears the gate cookie synchronously on every page reload / unload.
// This forces re-authentication on the next visit.
export function GateClearer() {
  useEffect(() => {
    const clear = () => {
      document.cookie = `${GATE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    };
    window.addEventListener("beforeunload", clear);
    return () => window.removeEventListener("beforeunload", clear);
  }, []);

  return null;
}
