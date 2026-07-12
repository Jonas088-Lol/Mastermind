/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect } from "react";
import { native, isNative, getPlatform } from "@/lib/native";

/**
 * Runs once on app mount.
 * - Hides the splash screen after hydration
 * - Adapts status bar to current theme
 * - Registers push notification token with the server
 * - Adds Android safe-area CSS variables
 */
export function AppInit() {
  useEffect(() => {
    if (!isNative()) return;

    async function init() {
      // 1. Hide splash (Next.js is hydrated, safe to show content)
      await native.splash.hide();

      // 2. Status bar
      const isDark = document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      await native.statusBar.setStyle(
        isDark ? "Dark" : "Light",
        isDark ? "#0d1117" : "#ffffff"
      );

      // 3. Register push notifications and send token to server
      const token = await native.push.register(() => {
        // Vordergrund-Benachrichtigung empfangen — hier könnte künftig ein
        // In-App-Toast erscheinen. Bewusst kein Logging in Produktion.
      });

      if (token) {
        try {
          await fetch("/api/push/native-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, platform: getPlatform() }),
          });
        } catch {
          // Silent — push token can be re-registered on next open
        }
      }

      // 4. Android back button — prevent accidental exits on root screens
      if (getPlatform() === "android") {
        native.app.onBack(() => {
          if (window.history.length > 1) {
            window.history.back();
          }
          // If no history, Android system handles the back (closes app)
        });
      }
    }

    init().catch(console.error);
  }, []);

  // This component renders nothing — it only runs side effects
  return null;
}
