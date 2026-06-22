"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, Share, Plus, CheckCircle } from "lucide-react";

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|Windows|Linux/i.test(ua)) return "desktop";
  return "unknown";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
}

export function AppDownloadSection() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installed, setInstalled] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installing, setInstalling] = useState(false);
  const [iosStep, setIosStep] = useState(0);

  useEffect(() => {
    setPlatform(detectPlatform());
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
        <CheckCircle className="size-5 text-success shrink-0" />
        <div>
          <p className="text-sm font-semibold text-success">App ist bereits installiert</p>
          <p className="text-xs text-muted-fg">MasterMind läuft als eigenständige App auf deinem Gerät.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* iOS */}
      {platform === "ios" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl"></span>
              <div>
                <p className="text-sm font-bold">iOS — Zum Home-Bildschirm</p>
                <p className="text-xs text-muted-fg">Funktioniert als vollwertige App ohne App Store</p>
              </div>
            </div>

            {/* Step-by-step */}
            <div className="space-y-2">
              {[
                {
                  icon: <Share className="size-4" />,
                  text: 'Tippe das "Teilen"-Symbol in Safari (Rechteck mit Pfeil nach oben) unten in der Adressleiste',
                },
                {
                  icon: <Plus className="size-4" />,
                  text: 'Scrolle nach unten und tippe auf "Zum Home-Bildschirm"',
                },
                {
                  icon: <CheckCircle className="size-4" />,
                  text: 'Tippe "Hinzufügen" — MasterMind erscheint als App-Icon',
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-bg p-3 cursor-pointer"
                  onClick={() => setIosStep(i)}
                  style={{ opacity: iosStep === i ? 1 : 0.65 }}
                >
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-black"
                    style={{
                      background: iosStep === i ? "hsl(var(--color-brand) / 0.15)" : "var(--color-surface-2)",
                      color: iosStep === i ? "var(--color-brand)" : "var(--color-muted-fg)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="mt-0.5 text-muted-fg shrink-0">{step.icon}</span>
                    <p className="text-xs text-fg">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[11px] text-muted-fg">
              ⚠️ Nur in <strong>Safari</strong> möglich — nicht in Chrome oder anderen Browsern auf iOS.
            </p>
          </div>
        </div>
      )}

      {/* Android */}
      {platform === "android" && (
        <div className="space-y-3">
          {/* PWA install (if prompt is available) */}
          {installPrompt ? (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="text-sm font-bold">App installieren</p>
                  <p className="text-xs text-muted-fg">Als App auf dem Home-Bildschirm — kein App Store nötig</p>
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
          ) : (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="text-sm font-bold">Android — Zum Home-Bildschirm</p>
                  <p className="text-xs text-muted-fg">In Chrome: Menü → "Zum Startbildschirm hinzufügen"</p>
                </div>
              </div>
            </div>
          )}

          {/* APK download */}
          <a
            href="/downloads/mastermind.apk"
            download
            className="group flex items-center gap-4 rounded-xl border border-border bg-bg p-4 transition-colors hover:bg-surface"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl transition-colors group-hover:bg-brand/10">
              📦
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Android APK herunterladen</p>
              <p className="text-xs text-muted-fg">Direkte Installation · kein Play Store nötig</p>
              <p className="mt-0.5 text-[11px] text-muted-fg">
                Einstellungen → Sicherheit → "Unbekannte Quellen" aktivieren
              </p>
            </div>
            <Download className="size-4 text-muted-fg shrink-0" />
          </a>
        </div>
      )}

      {/* Desktop */}
      {(platform === "desktop" || platform === "unknown") && (
        <div className="space-y-3">
          {installPrompt ? (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
              <div className="flex items-center gap-3 mb-3">
                <Smartphone className="size-6 text-brand shrink-0" />
                <div>
                  <p className="text-sm font-bold">Als Desktop-App installieren</p>
                  <p className="text-xs text-muted-fg">Öffnet MasterMind als eigenständiges Fenster</p>
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
          ) : (
            <p className="text-xs text-muted-fg">
              Installiere MasterMind als App über das Browser-Menü (Chrome / Edge: Adressleiste → Install-Icon, oder Menü → &quot;App installieren&quot;).
            </p>
          )}

          {/* Hint for mobile */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <p className="text-sm font-bold">Auf dem Smartphone nutzen</p>
            <div className="flex items-start gap-2 text-xs text-muted-fg">
              <span></span>
              <p><strong>iOS:</strong> Safari öffnen → Teilen-Symbol → "Zum Home-Bildschirm"</p>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-fg">
              <span>🤖</span>
              <p><strong>Android:</strong> APK herunterladen oder in Chrome-Menü → "Zum Startbildschirm"</p>
            </div>
          </div>

          <a
            href="/downloads/mastermind.apk"
            download
            className="group flex items-center gap-4 rounded-xl border border-border bg-bg p-4 transition-colors hover:bg-surface"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl">
              📦
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold">Android APK</p>
              <p className="text-xs text-muted-fg">Direkt-Download für Android-Geräte</p>
            </div>
            <Download className="size-4 text-muted-fg shrink-0" />
          </a>
        </div>
      )}
    </div>
  );
}
