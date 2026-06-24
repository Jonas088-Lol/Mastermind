import type { Metadata } from "next";
import { Download, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "MasterMind herunterladen",
  description:
    "MasterMind für Windows, macOS, Linux, Android und iOS herunterladen. Kostenlos, für alle Geräte.",
};

interface DownloadItem {
  label: string;
  sub: string;
  url: string;
  ext: string;
}

interface Platform {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  items: DownloadItem[];
  note?: string;
  pwa?: boolean;
}

const PLATFORMS: Platform[] = [
  {
    id: "windows",
    emoji: "🪟",
    title: "Windows",
    desc: "Windows 10 / 11",
    items: [
      {
        label: "Installer x64",
        sub: "Intel/AMD 64-Bit (empfohlen)",
        url: "/downloads/MasterMind-Setup-x64.exe",
        ext: ".exe",
      },
      {
        label: "Installer ARM64",
        sub: "Surface, Snapdragon-Laptops",
        url: "/downloads/MasterMind-Setup-arm64.exe",
        ext: ".exe",
      },
      {
        label: "Portable",
        sub: "Keine Installation nötig",
        url: "/downloads/MasterMind-Portable.exe",
        ext: ".exe",
      },
    ],
  },
  {
    id: "macos",
    emoji: "",
    title: "macOS",
    desc: "macOS 12 Monterey oder neuer",
    items: [
      {
        label: "Apple Silicon",
        sub: "M1 / M2 / M3 / M4",
        url: "/downloads/MasterMind-mac-arm64.dmg",
        ext: ".dmg",
      },
      {
        label: "Intel",
        sub: "Mac vor 2020",
        url: "/downloads/MasterMind-mac-x64.dmg",
        ext: ".dmg",
      },
    ],
  },
  {
    id: "linux",
    emoji: "🐧",
    title: "Linux",
    desc: "Ubuntu · Debian · Fedora und mehr",
    items: [
      {
        label: "AppImage x64",
        sub: "Direkt ausführbar, keine Installation",
        url: "/downloads/MasterMind-x64.AppImage",
        ext: ".AppImage",
      },
      {
        label: "AppImage ARM64",
        sub: "Raspberry Pi 4 / ARM-Systeme",
        url: "/downloads/MasterMind-arm64.AppImage",
        ext: ".AppImage",
      },
      {
        label: ".deb x64",
        sub: "Ubuntu / Debian / Linux Mint",
        url: "/downloads/MasterMind-x64.deb",
        ext: ".deb",
      },
    ],
  },
  {
    id: "android",
    emoji: "🤖",
    title: "Android",
    desc: "Android 8.0 oder neuer",
    note: 'Einstellungen → Sicherheit → "Unbekannte Quellen" aktivieren',
    items: [
      {
        label: "APK herunterladen",
        sub: "Direktinstallation · kein Play Store nötig",
        url: "/downloads/mastermind.apk",
        ext: ".apk",
      },
    ],
  },
  {
    id: "ios",
    emoji: "",
    title: "iPhone / iPad",
    desc: "iOS 16 oder neuer",
    pwa: true,
    items: [],
  },
];

export default function DownloadsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Download</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          MasterMind für jedes Gerät
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted-fg">
          Native Apps für Windows, macOS und Linux. Als PWA auf Android und iOS.
          Alle Daten synchronisieren sich automatisch.
        </p>
      </div>

      {/* Platform grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-bg p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl leading-none">{p.emoji}</span>
              <div>
                <h2 className="text-base font-bold">{p.title}</h2>
                <p className="text-xs text-muted-fg">{p.desc}</p>
              </div>
            </div>

            {p.pwa ? (
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-fg">Zum Home-Bildschirm hinzufügen</p>
                <ol className="space-y-1.5 text-muted-fg">
                  <li className="flex items-start gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold">
                      1
                    </span>
                    Diese Seite in <strong className="ml-1 text-fg">Safari</strong> öffnen
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold">
                      2
                    </span>
                    Teilen-Symbol → „Zum Home-Bildschirm"
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold">
                      3
                    </span>
                    „Hinzufügen" tippen
                  </li>
                </ol>
                <p className="pt-1 text-[11px] text-muted-fg">⚠ Nur in Safari verfügbar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {p.items.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    download
                    className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 transition-colors hover:border-brand/30 hover:bg-brand/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-muted-fg">{item.sub}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-fg">
                        {item.ext}
                      </span>
                      <Download className="size-4 text-muted-fg transition-colors group-hover:text-brand" />
                    </div>
                  </a>
                ))}
                {p.note && (
                  <p className="pt-1 text-[11px] text-muted-fg">{p.note}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Web app card — full width */}
        <div className="flex items-start gap-4 rounded-2xl border border-brand/20 bg-brand/5 p-5 sm:col-span-2 lg:col-span-3">
          <Globe className="mt-0.5 size-6 shrink-0 text-brand" />
          <div>
            <h2 className="text-base font-bold">Web-App · alle Geräte</h2>
            <p className="mt-0.5 text-sm text-muted-fg">
              MasterMind läuft direkt im Browser — kein Download erforderlich.{" "}
              <a href="/app" className="font-semibold text-brand hover:underline">
                Jetzt öffnen →
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-10 text-center text-xs text-muted-fg">
        Alle Downloads sind kostenlos. Für die Nutzung wird ein MasterMind-Konto benötigt.{" "}
        <a href="/registrieren" className="underline underline-offset-2 hover:text-fg">
          Jetzt registrieren
        </a>
      </p>
    </div>
  );
}
