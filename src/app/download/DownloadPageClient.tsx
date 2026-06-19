"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Smartphone, Shield, Wifi, ArrowRight,
} from "lucide-react";

const STEPS = [
  {
    num: 1,
    title: "APK herunterladen",
    desc: 'Tippe unten auf "Android herunterladen". Die APK-Datei wird auf dein Gerät geladen (ca. 10–30 MB).',
    icon: "⬇️",
  },
  {
    num: 2,
    title: "Installation erlauben",
    desc: 'Android fragt beim ersten Mal: "Unbekannte Apps installieren?" → Tippe auf Einstellungen → schalte "Diese Quelle erlauben" ein → zurück → Installieren.',
    icon: "🔓",
  },
  {
    num: 3,
    title: "Öffnen & anmelden",
    desc: 'Tippe auf "Öffnen" oder suche MasterMind in deiner App-Liste. Melde dich mit deinen Schuldaten an.',
    icon: "✅",
  },
];

const FAQS = [
  {
    q: "Warum gibt es keine Play-Store-Version?",
    a: "MasterMind ist eine Schul-App, die direkt für deine Schule bereitgestellt wird. Der Direktdownload ermöglicht es uns, schultypische Anpassungen (Logo, Farben, Server) ohne Verzögerungen auszuliefern.",
  },
  {
    q: "Ist die APK sicher?",
    a: "Ja. Die APK wird direkt vom Server deiner Schule ausgeliefert – dieselbe vertrauenswürdige Quelle wie die Web-App. Es werden keine Daten an Dritte übertragen.",
  },
  {
    q: "Mein Android lässt die Installation nicht zu.",
    a: "Öffne Einstellungen → Apps → Spezielle App-Zugriffe → Unbekannte Apps installieren → wähle deinen Browser → erlaube die Installation. Danach erneut versuchen.",
  },
  {
    q: "Gibt es eine iPhone-Version?",
    a: "Eine iOS-Version ist in Vorbereitung. In der Zwischenzeit kannst du die Web-App in Safari öffnen und über Teilen → Zum Home-Bildschirm als PWA installieren.",
  },
  {
    q: "Wie erhalte ich Updates?",
    a: "Die App lädt beim Start automatisch den neuesten Stand vom Server. Du musst die APK nur bei größeren nativen Updates erneut installieren – du wirst dann darüber informiert.",
  },
];

interface Props {
  apkUrl: string;
  appVersion: string;
}

export function DownloadPageClient({ apkUrl, appVersion }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "https://app.mastermind.app/download";

  function copyLink() {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="border-b border-white/8 px-5 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="font-bold tracking-tight">
            Master<span className="text-brand">Mind</span>
          </Link>
          <Link href="/login"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-brand/50 hover:text-white transition-colors">
            Anmelden
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-5 pb-16">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="py-12 text-center">
          {/* App icon */}
          <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-3xl bg-linear-to-br from-brand/80 to-brand-dark shadow-xl shadow-brand/20">
            <span className="text-4xl">🎓</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            MasterMind App
          </h1>
          <p className="mt-2 text-white/50 text-sm font-mono">Version {appVersion}</p>
          <p className="mt-4 text-base text-white/65 max-w-sm mx-auto leading-relaxed">
            Die Schul-App direkt auf dein Android-Gerät — schnell installiert, immer aktuell.
          </p>

          {/* Download button */}
          <a
            href={apkUrl}
            download="mastermind.apk"
            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-brand px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand/30 transition-all hover:scale-105 hover:shadow-brand/50 active:scale-95"
          >
            <Download className="size-5" strokeWidth={2} />
            Android herunterladen (.apk)
          </a>

          {/* Share link */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              {copied ? <CheckCircle2 className="size-3.5 text-green-400" /> : <ArrowRight className="size-3.5" />}
              {copied ? "Link kopiert!" : "Link teilen / QR-Code"}
            </button>
          </div>
        </div>

        {/* ── Badges ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: <Shield className="size-4 text-green-400" />, label: "DSGVO-konform" },
            { icon: <Wifi className="size-4 text-brand" />, label: "Immer aktuell" },
            { icon: <Smartphone className="size-4 text-purple-400" />, label: "Android 7+" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/8 bg-white/4 py-4 text-center">
              {icon}
              <span className="text-[11px] font-semibold text-white/60">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Installation steps ───────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-5 text-lg font-bold">Installation in 3 Schritten</h2>
          <div className="flex flex-col gap-3">
            {STEPS.map((step) => (
              <div key={step.num} className="flex gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <span className="text-2xl">{step.icon}</span>
                  <div className="flex size-6 items-center justify-center rounded-full bg-brand/20 text-[11px] font-bold text-brand">
                    {step.num}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Android settings path ────────────────────────────────────────── */}
        <section className="mb-10 rounded-2xl border border-yellow-500/20 bg-yellow-500/6 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow-400" />
            <div>
              <p className="text-sm font-semibold text-yellow-300">Tipp: „Unbekannte Quellen" aktivieren</p>
              <p className="mt-1 text-xs leading-relaxed text-yellow-200/60">
                Einstellungen → Apps &amp; Benachrichtigungen → Spezielle App-Zugriffe →
                Unbekannte Apps installieren → wähle deinen Browser → „Aus dieser Quelle zulassen" einschalten.
                <br /><br />
                Bei neueren Android-Versionen erscheint dieser Dialog automatisch beim Download.
              </p>
            </div>
          </div>
        </section>

        {/* ── PWA hint (iOS) ───────────────────────────────────────────────── */}
        <section className="mb-10 rounded-2xl border border-white/8 bg-white/4 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🍎</span>
            <p className="font-semibold text-sm">iPhone / iPad</p>
          </div>
          <p className="text-xs leading-relaxed text-white/55">
            Öffne <strong className="text-white/80">app.mastermind.app</strong> in Safari → tippe auf das
            Teilen-Symbol (□↑) → <strong className="text-white/80">„Zum Home-Bildschirm"</strong> → Hinzufügen.
            Die App verhält sich dann wie eine native App.
          </p>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-bold">Häufige Fragen</h2>
          <div className="flex flex-col gap-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-white/8 bg-white/4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-white/80 hover:text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="size-4 shrink-0 text-white/40" />
                    : <ChevronDown className="size-4 shrink-0 text-white/40" />
                  }
                </button>
                {openFaq === i && (
                  <div className="border-t border-white/6 px-4 pb-4 pt-3 text-xs leading-relaxed text-white/55">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="mt-12 text-center text-xs text-white/30">
          <p>MasterMind · Schulmanagement-Plattform</p>
          <p className="mt-1">
            <Link href="/datenschutz" className="hover:text-white/60 transition-colors">Datenschutz</Link>
            {" · "}
            <Link href="/impressum" className="hover:text-white/60 transition-colors">Impressum</Link>
            {" · "}
            <Link href="/kontakt" className="hover:text-white/60 transition-colors">Kontakt</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
