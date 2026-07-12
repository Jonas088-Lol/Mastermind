/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useState } from "react";
import { Download, Share, CheckCircle } from "lucide-react";

type OS = "windows" | "macos" | "linux" | "android" | "ios" | "unknown";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Win/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";
  return "unknown";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as { standalone?: boolean }).standalone === true)
  );
}

interface DownloadItem {
  key: string;
  label: string;
  sub: string;
  url: string;
  ext: string;
}

const WIN: DownloadItem[] = [
  {
    key: "win_x64",
    label: "Windows Installer · x64",
    sub: "Intel/AMD 64-Bit (Standard)",
    url: "/downloads/MasterMind-Setup-x64.exe",
    ext: ".exe",
  },
  {
    key: "win_arm64",
    label: "Windows Installer · ARM64",
    sub: "Surface, Snapdragon-Laptops",
    url: "/downloads/MasterMind-Setup-arm64.exe",
    ext: ".exe",
  },
  {
    key: "win_portable",
    label: "Windows Portable",
    sub: "Keine Installation · EXE direkt starten",
    url: "/downloads/MasterMind-Portable.exe",
    ext: ".exe",
  },
];

const MAC: DownloadItem[] = [
  {
    key: "mac_silicon",
    label: "macOS · Apple Silicon",
    sub: "M1 / M2 / M3 / M4",
    url: "/downloads/MasterMind-mac-arm64.dmg",
    ext: ".dmg",
  },
  {
    key: "mac_intel",
    label: "macOS · Intel",
    sub: "Mac vor 2020",
    url: "/downloads/MasterMind-mac-x64.dmg",
    ext: ".dmg",
  },
];

const LINUX: DownloadItem[] = [
  {
    key: "linux_appimage_x64",
    label: "Linux AppImage · x64",
    sub: "Direkt ausführbar, keine Installation",
    url: "/downloads/MasterMind-x64.AppImage",
    ext: ".AppImage",
  },
  {
    key: "linux_appimage_arm64",
    label: "Linux AppImage · ARM64",
    sub: "Raspberry Pi 4 / ARM-Server",
    url: "/downloads/MasterMind-arm64.AppImage",
    ext: ".AppImage",
  },
  {
    key: "linux_deb",
    label: "Linux .deb · x64",
    sub: "Ubuntu · Debian · Linux Mint",
    url: "/downloads/MasterMind-x64.deb",
    ext: ".deb",
  },
];

function DownloadGroup({
  emoji,
  title,
  items,
  highlighted,
  children,
}: {
  emoji: string;
  title: string;
  items: DownloadItem[];
  highlighted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlighted ? "border-brand/30 bg-brand/5" : "border-border bg-bg"
      }`}
    >
      {highlighted && (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand">
          ★ Empfohlen für dich
        </p>
      )}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl leading-none">{emoji}</span>
        <span className="text-sm font-bold">{title}</span>
      </div>
      {children}
      <div className="space-y-1.5">
        {items.map((item) => (
          <a
            key={item.key}
            href={item.url}
            download
            className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors hover:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{item.label}</p>
              <p className="text-[11px] text-muted-fg">{item.sub}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-fg">
                {item.ext}
              </span>
              <Download className="size-3.5 text-muted-fg transition-colors group-hover:text-brand" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function AppDownloadSection() {
  const [os, setOs] = useState<OS>("unknown");
  const [installed, setInstalled] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installing, setInstalling] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setOs(detectOS());
    setInstalled(isStandalone());
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handlePwaInstall() {
    if (!installPrompt) return;
    setInstalling(true);
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstalled(true);
      setInstallPrompt(null);
    }
    setInstalling(false);
  }

  if (installed) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
        <CheckCircle className="size-5 shrink-0 text-success" />
        <div>
          <p className="text-sm font-semibold text-success">App ist bereits installiert</p>
          <p className="text-xs text-muted-fg">MasterMind läuft als eigenständige App auf deinem Gerät.</p>
        </div>
      </div>
    );
  }

  const hasHighlight = os !== "unknown";

  return (
    <div className="space-y-3">
      {/* PWA prompt (Chrome/Edge desktop or Android Chrome) */}
      {installPrompt && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand">
            ★ Empfohlen für dich
          </p>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-sm font-bold">Als App installieren</p>
              <p className="text-xs text-muted-fg">Eigenständiges Fenster · kein Browser nötig</p>
            </div>
          </div>
          <button
            onClick={handlePwaInstall}
            disabled={installing}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <Download className="size-4" />
            {installing ? "Wird installiert…" : "App installieren"}
          </button>
        </div>
      )}

      {/* iOS */}
      {os === "ios" && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand">
            ★ Empfohlen für dich
          </p>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl"></span>
            <span className="text-sm font-bold">iPhone / iPad</span>
          </div>
          <ol className="space-y-2 text-xs text-muted-fg">
            <li className="flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                1
              </span>
              Öffne diese Seite in <strong className="ml-1 text-fg">Safari</strong>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                2
              </span>
              <span>
                Tippe das{" "}
                <Share className="mx-0.5 inline size-3.5 align-middle" />
                <strong className="text-fg">Teilen</strong>-Symbol unten in Safari
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                3
              </span>
              <span>
                Wähle <strong className="text-fg">„Zum Home-Bildschirm"</strong> → Hinzufügen
              </span>
            </li>
          </ol>
          <p className="mt-3 text-[11px] text-muted-fg">⚠ Nur in Safari möglich.</p>
        </div>
      )}

      {/* Android (no PWA prompt) */}
      {os === "android" && !installPrompt && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand">
            ★ Empfohlen für dich
          </p>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="text-sm font-bold">Android</span>
          </div>
          <a
            href="/downloads/mastermind.apk"
            download
            className="group mb-2 flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors hover:bg-surface-2"
          >
            <div className="flex-1">
              <p className="text-xs font-semibold">Android APK herunterladen</p>
              <p className="text-[11px] text-muted-fg">Direkte Installation · kein Play Store nötig</p>
            </div>
            <Download className="size-3.5 text-muted-fg" />
          </a>
          <p className="text-[11px] text-muted-fg">
            Einstellungen → Sicherheit → „Unbekannte Quellen" aktivieren
          </p>
        </div>
      )}

      {/* Desktop OS — highlighted */}
      {os === "windows" && <DownloadGroup emoji="🪟" title="Windows" items={WIN} highlighted />}
      {os === "macos" && <DownloadGroup emoji="" title="macOS" items={MAC} highlighted />}
      {os === "linux" && <DownloadGroup emoji="🐧" title="Linux" items={LINUX} highlighted />}

      {/* Toggle for other platforms */}
      {hasHighlight && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-muted-fg underline underline-offset-2 hover:text-fg"
        >
          Alle Plattformen anzeigen
        </button>
      )}

      {/* All platforms */}
      {(showAll || !hasHighlight) && (
        <div className="space-y-3">
          {hasHighlight && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Weitere Plattformen
            </p>
          )}

          {os !== "windows" && <DownloadGroup emoji="🪟" title="Windows" items={WIN} />}
          {os !== "macos" && <DownloadGroup emoji="" title="macOS" items={MAC} />}
          {os !== "linux" && <DownloadGroup emoji="🐧" title="Linux" items={LINUX} />}

          {os !== "android" && (
            <div className="rounded-xl border border-border bg-bg p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <span className="text-sm font-bold">Android</span>
              </div>
              <a
                href="/downloads/mastermind.apk"
                download
                className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors hover:bg-surface-2"
              >
                <div className="flex-1">
                  <p className="text-xs font-semibold">Android APK herunterladen</p>
                  <p className="text-[11px] text-muted-fg">Direkte Installation · kein Play Store nötig</p>
                </div>
                <Download className="size-3.5 text-muted-fg" />
              </a>
            </div>
          )}

          {os !== "ios" && (
            <div className="rounded-xl border border-border bg-bg p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl"></span>
                <span className="text-sm font-bold">iPhone / iPad (iOS)</span>
              </div>
              <p className="text-xs text-muted-fg">
                Safari → Teilen-Symbol → „Zum Home-Bildschirm" → Hinzufügen
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
