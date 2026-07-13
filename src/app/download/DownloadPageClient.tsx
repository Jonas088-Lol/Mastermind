/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Download, CheckCircle2, ArrowRight, Smartphone, Monitor,
  Globe, Shield, Zap, RefreshCw, ChevronDown, ChevronUp,
  ExternalLink, Apple,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

/* ─── Platform data ───────────────────────────────────────────────────────── */

type PlatformId = "android" | "ios" | "windows" | "mac" | "linux" | "pwa";

interface Platform {
  id: PlatformId;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  downloadUrl?: string;
  downloadLabel: string;
  storeLabel?: string;
  storeUrl?: string;
  instructions: string[];
  available: boolean;
}

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M6.18 15.64a2.18 2.18 0 0 1-2.18-2.18V9.82a2.18 2.18 0 0 1 4.36 0v3.64a2.18 2.18 0 0 1-2.18 2.18m11.64 0a2.18 2.18 0 0 1-2.18-2.18V9.82a2.18 2.18 0 0 1 4.36 0v3.64a2.18 2.18 0 0 1-2.18 2.18M5 8.73A7 7 0 0 1 12 2a7 7 0 0 1 7 6.73H5m14.7 3.59c0-1.58.71-3 1.82-3.95A9.12 9.12 0 0 0 12 2 9.12 9.12 0 0 0 2.48 8.37c1.11.95 1.82 2.37 1.82 3.95v3.68c0 .9.54 1.67 1.32 2v1.09a1.42 1.42 0 0 0 1.41 1.41 1.42 1.42 0 0 0 1.42-1.41v-.91h6.1v.91a1.42 1.42 0 0 0 1.41 1.41 1.42 1.42 0 0 0 1.42-1.41V18c.78-.33 1.32-1.1 1.32-2v-3.68Z" />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M3 12V6.75l6-1.32v6.57H3zm17 0V5.25L10 3.5v8.5h10zm-17 1h6v6.43L3 18v-5zm17 0v6.5l-10-1.82V13h10z" />
    </svg>
  );
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.5 0c-.2 0-.4.2-.4.4l.1.4c.1.2.2.3.1.6-.1.1-.1.3 0 .4l.2.5c.2.2.2.4.2.6 0 .3-.1.6-.4.8l-.2.1c-.1.1-.2.1-.3.2l-.1.1c-.2.2-.3.4-.3.7s.1.5.2.7c.1.2.2.4.3.6.1.2.1.4 0 .6-.1.2-.2.3-.2.5 0 .1 0 .3.1.4.1.2.2.3.2.5s-.1.4-.2.5L11 8c-.3.3-.4.7-.4 1 0 .4.2.7.4 1l.2.2c.1.1.1.2.2.3 0 .2-.1.3-.2.5-.1.1-.2.3-.2.5s.1.4.3.5c.1.1.3.2.4.2.2 0 .4 0 .5-.1l.2-.1c.2-.1.3-.1.5-.2.3-.1.5-.3.6-.5.1-.3.1-.6 0-.8-.1-.3-.3-.5-.5-.6l-.3-.1c-.1-.1-.2-.1-.3-.1 0-.1 0-.2.1-.3.1-.2.1-.3.1-.5 0-.3-.1-.5-.3-.7-.2-.1-.3-.3-.3-.5s.2-.4.4-.5c.3-.1.5-.1.7-.1s.3 0 .5.1c.2 0 .3.1.5.1.3 0 .6-.1.8-.3.2-.2.3-.5.2-.8 0-.3-.2-.5-.4-.7-.1-.1-.3-.2-.3-.4 0-.1.1-.2.2-.3.2-.2.4-.4.4-.7 0-.2-.1-.4-.3-.6-.1-.1-.3-.2-.4-.2-.2 0-.3 0-.5.1l-.2.2c-.2.1-.3.3-.5.4-.2.1-.4.1-.6 0-.2 0-.3-.1-.4-.2-.2-.2-.3-.4-.3-.7 0-.2.1-.4.2-.5.1-.2.2-.3.2-.5 0-.3-.1-.5-.3-.6-.1-.1-.3-.2-.5-.2zM8 10c-.2 0-.4 0-.5.1C7 10.3 6.6 10.8 6.6 11.4c0 .3.1.6.4.9.2.2.4.4.5.7.1.2.1.5 0 .7-.1.2-.2.4-.4.5-.2.1-.4.2-.6.2-.3 0-.5-.1-.7-.3-.2-.2-.3-.4-.4-.7-.2-.6-.3-1.2-.3-1.9 0-.8.2-1.5.5-2.1.3-.6.8-1 1.4-1.1.5-.1 1.1 0 1.5.3.4.3.7.8.7 1.4 0 .3-.1.5-.3.7-.2.2-.4.3-.7.3zm8 0c-.3 0-.5-.1-.7-.3-.2-.2-.3-.4-.3-.7 0-.6.3-1.1.7-1.4.4-.3 1-.4 1.5-.3.6.1 1.1.5 1.4 1.1.3.6.5 1.3.5 2.1 0 .7-.1 1.3-.3 1.9-.1.3-.2.5-.4.7-.2.2-.4.3-.7.3-.2 0-.4-.1-.6-.2-.2-.1-.3-.3-.4-.5-.1-.2-.1-.5 0-.7.1-.3.3-.5.5-.7.3-.3.4-.6.4-.9 0-.6-.4-1.1-.9-1.3-.1-.1-.3-.1-.5-.1zm-8 6c-.4 0-.7.3-.7.7 0 1.2.4 2.3 1 3.2.6.9 1.5 1.5 2.5 1.5H13c1 0 1.9-.6 2.5-1.5.6-.9 1-2 1-3.2 0-.4-.3-.7-.7-.7H8z" />
    </svg>
  );
}

function getPlatforms(baseUrl: string): Platform[] {
  return [
    {
      id: "android",
      label: "Android",
      sublabel: "APK · Android 8+",
      icon: <AndroidIcon className="size-8" />,
      color: "#3DDC84",
      downloadUrl: "/downloads/mastermind.apk",
      downloadLabel: "APK herunterladen",
      instructions: [
        "APK herunterladen (ca. 15-30 MB)",
        'Wenn Android fragt: "Unbekannte Apps erlauben" -> Ja',
        "Installieren -> Oeffnen -> Mit Schuldaten anmelden",
      ],
      available: true,
    },
    {
      id: "ios",
      label: "iPhone · iPad",
      sublabel: "iOS 16+ · iPadOS 16+",
      icon: <Apple className="size-8" />,
      color: "#147EFB",
      downloadLabel: "Im App Store öffnen",
      storeLabel: "App Store",
      storeUrl: "https://apps.apple.com",
      instructions: [
        "Link oeffnen -> App Store oeffnet sich automatisch",
        '"Laden" / "Installieren" antippen',
        "Mit Schuldaten anmelden",
      ],
      available: false,
    },
    {
      id: "windows",
      label: "Windows",
      sublabel: "Windows 10 / 11 (64-Bit)",
      icon: <WindowsIcon className="size-8" />,
      color: "#0078D4",
      downloadUrl: "/downloads/mastermind-windows-setup.exe",
      downloadLabel: "Setup.exe herunterladen",
      instructions: [
        "Setup.exe herunterladen und starten",
        'Windows SmartScreen-Warnung: "Trotzdem ausfuehren" klicken',
        "Installation abschliessen - App startet automatisch",
      ],
      available: true,
    },
    {
      id: "mac",
      label: "macOS",
      sublabel: "macOS 12 Monterey+",
      icon: <Apple className="size-8" />,
      color: "#555555",
      downloadUrl: "/downloads/mastermind-mac.dmg",
      downloadLabel: "DMG herunterladen",
      instructions: [
        "DMG-Datei öffnen",
        "MasterMind in den Programme-Ordner ziehen",
        "Beim ersten Start: Rechtsklick -> Oeffnen (Gatekeeper umgehen)",
      ],
      available: true,
    },
    {
      id: "linux",
      label: "Linux",
      sublabel: "AppImage · Ubuntu, Debian, Arch …",
      icon: <LinuxIcon className="size-8" />,
      color: "#E95420",
      downloadUrl: "/downloads/mastermind-linux.AppImage",
      downloadLabel: "AppImage herunterladen",
      instructions: [
        "AppImage herunterladen",
        "Ausführbar machen: chmod +x MasterMind-*.AppImage",
        "Starten: ./MasterMind-*.AppImage",
      ],
      available: true,
    },
    {
      id: "pwa",
      label: "Browser / PWA",
      sublabel: "Alle Plattformen · kein Download nötig",
      icon: <Globe className="size-8" />,
      color: "#6366F1",
      downloadLabel: "Jetzt öffnen",
      storeUrl: baseUrl,
      instructions: [
        "konvertis.de im Browser öffnen",
        'Chrome/Edge: "App installieren"-Symbol in der Adressleiste',
        "Safari iOS: Teilen -> Zum Home-Bildschirm",
      ],
      available: true,
    },
  ];
}

/* ─── Feature highlights ──────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: <Zap className="size-5 text-yellow-400" />,
    title: "Server-First",
    desc: "Alle Inhalte laden direkt vom Server. Keine veralteten App-Versionen mehr.",
  },
  {
    icon: <RefreshCw className="size-5 text-brand" />,
    title: "Automatisch aktuell",
    desc: "Updates erscheinen sofort — ohne App-Store-Wartezeiten.",
  },
  {
    icon: <Shield className="size-5 text-green-400" />,
    title: "DSGVO-konform",
    desc: "Server in Deutschland. Keine Tracking-SDKs. AVV für jede Schule.",
  },
];

/* ─── Detect OS ───────────────────────────────────────────────────────────── */

function detectOS(): PlatformId {
  if (typeof navigator === "undefined") return "pwa";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/win/.test(ua)) return "windows";
  if (/mac/.test(ua)) return "mac";
  if (/linux/.test(ua)) return "linux";
  return "pwa";
}

/* ─── Component ───────────────────────────────────────────────────────────── */

interface Props {
  appVersion: string;
  baseUrl: string;
}

export function DownloadPageClient({ baseUrl }: Props) {
  const platforms = getPlatforms(baseUrl);
  const [active, setActive] = useState<PlatformId>("android");
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-detect user's OS
  useEffect(() => {
    setActive(detectOS());
  }, []);

  const current = platforms.find((p) => p.id === active)!;

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-bg text-fg">

      {/* Einheitliche Landing-Navigationsleiste */}
      <Navbar />

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-8">

        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <div className="py-14 text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center overflow-hidden rounded-[22px] border border-border bg-surface shadow-2xl shadow-brand/10">
            <Image src="/brand/icon.png" alt="MasterMind" width={80} height={80} className="size-full object-cover" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            MasterMind App
          </h1>
          <p className="mt-3 text-muted-fg">
            Für jede Plattform. Immer direkt vom Server.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            {[
              { color: "#3DDC84", label: "Android" },
              { color: "#147EFB", label: "iOS" },
              { color: "#0078D4", label: "Windows" },
              { color: "#555555", label: "macOS" },
              { color: "#E95420", label: "Linux" },
              { color: "#6366F1", label: "Browser" },
            ].map(({ color, label }) => (
              <span
                key={label}
                className="rounded-full border border-border px-2.5 py-0.5 font-medium text-muted-fg"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Platform switcher ───────────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

          {/* Left: platform list */}
          <div className="flex flex-col gap-1.5">
            {platforms.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  active === p.id
                    ? "border-brand/30 bg-brand/5"
                    : "border-border hover:bg-surface",
                  !p.available && "opacity-50"
                )}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ color: p.color, backgroundColor: p.color + "20" }}
                >
                  {p.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{p.label}</span>
                    {!p.available && (
                      <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted-fg">
                        bald
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-fg">{p.sublabel}</span>
                </div>
                {active === p.id && (
                  <div className="size-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                )}
              </button>
            ))}
          </div>

          {/* Right: active platform detail */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            {/* Platform header */}
            <div className="flex items-start gap-4">
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
                style={{ color: current.color, backgroundColor: current.color + "20" }}
              >
                {current.icon}
              </span>
              <div>
                <h2 className="text-xl font-bold">{current.label}</h2>
                <p className="text-sm text-muted-fg">{current.sublabel}</p>
              </div>
            </div>

            {/* Download / store button */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {current.available ? (
                <>
                  {current.downloadUrl && (
                    <a
                      href={current.downloadUrl}
                      download
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                      style={{ backgroundColor: current.color }}
                    >
                      <Download className="size-4" strokeWidth={2.5} />
                      {current.downloadLabel}
                    </a>
                  )}
                  {current.storeUrl && (
                    <a
                      href={current.storeUrl}
                      target={current.id === "pwa" ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg px-6 py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface"
                    >
                      <ExternalLink className="size-4" />
                      {current.id === "pwa" ? "App öffnen" : current.storeLabel}
                    </a>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-5 py-3">
                  <span className="text-sm text-muted-fg">Bald im {current.storeLabel}</span>
                </div>
              )}
            </div>

            {/* Install instructions */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowAllSteps((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-fg hover:text-fg transition-colors"
              >
                {showAllSteps ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {showAllSteps ? "Anleitung ausblenden" : "Installationsanleitung"}
              </button>

              {showAllSteps && (
                <ol className="mt-4 flex flex-col gap-3">
                  {current.instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ backgroundColor: current.color + "20", color: current.color }}>
                        {i + 1}
                      </span>
                      <span className="pt-0.5 text-sm text-muted-fg">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* PWA tip for mobile */}
            {current.id !== "pwa" && (current.id === "android" || current.id === "ios") && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
                <Globe className="mt-0.5 size-4 shrink-0 text-brand" />
                <p className="text-xs text-muted-fg">
                  <strong className="font-semibold text-fg">Tipp:</strong>{" "}
                  Du kannst MasterMind auch direkt im Browser unter{" "}
                  <a href={baseUrl} className="text-brand underline" target="_blank" rel="noopener noreferrer">
                    konvertis.de
                  </a>{" "}
                  nutzen — ohne Installation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Features ──────────────────────────────────────────────────────────── */}
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-surface-2">
                {f.icon}
              </div>
              <p className="font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-muted-fg">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Share ──────────────────────────────────────────────────────────────── */}
        <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center">
          <Smartphone className="size-8 text-muted-fg" />
          <div>
            <p className="font-semibold">Link teilen</p>
            <p className="mt-1 text-sm text-muted-fg">
              Schicke diesen Link an Schüler oder Eltern.
            </p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
          >
            {copied
              ? <CheckCircle2 className="size-4 text-green-500" />
              : <ArrowRight className="size-4 text-muted-fg" />
            }
            {copied ? "Kopiert!" : "Link kopieren"}
          </button>
        </div>

      </main>

      {/* Einheitlicher Landing-Footer */}
      <Footer />
    </div>
  );
}
