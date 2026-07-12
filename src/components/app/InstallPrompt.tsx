/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  const handleInstall = async () => {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 border border-border bg-bg px-4 py-3 shadow-lg lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
      <Download className="size-5 shrink-0 text-brand" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">App installieren</p>
        <p className="text-xs text-muted-fg">Mastermind als App auf deinem Gerät speichern.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleInstall}
          className="bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg hover:bg-brand/90"
        >
          Installieren
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-muted-fg hover:text-fg"
          aria-label="Schließen"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
