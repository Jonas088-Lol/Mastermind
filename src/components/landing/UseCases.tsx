"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { AnimateOnScroll } from "./AnimateOnScroll";

const audiences = [
  {
    role: "Schüler",
    emoji: "🎓",
    accent: "blue",
    tabActive: "bg-blue-50 text-blue-600 border-b-2 border-blue-500",
    tabIdle: "text-muted-fg hover:text-fg hover:bg-surface",
    checkColor: "text-blue-500",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    headline: "Lernen, das wirklich hängen bleibt",
    points: [
      "KI-Tutor erklärt jede Aufgabe Schritt für Schritt",
      "Karteikarten mit Spaced-Repetition für Klausuren",
      "Streaks und Lerngruppen halten dich am Ball",
    ],
  },
  {
    role: "Lehrer",
    emoji: "👩‍🏫",
    accent: "green",
    tabActive: "bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500",
    tabIdle: "text-muted-fg hover:text-fg hover:bg-surface",
    checkColor: "text-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    headline: "Spart stundenlange Arbeit pro Woche",
    points: [
      "Aufgaben & Klassenarbeiten in Minuten generiert",
      "Auto-Korrektur-Vorschläge — du behältst die Kontrolle",
      "Live-Heatmap: Lernstand der Klasse auf einen Blick",
      "Kommunikation gebündelt — keine unnötigen Extra-Apps",
    ],
  },
  {
    role: "Schulleitung",
    emoji: "🏫",
    accent: "amber",
    tabActive: "bg-amber-50 text-amber-600 border-b-2 border-amber-500",
    tabIdle: "text-muted-fg hover:text-fg hover:bg-surface",
    checkColor: "text-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    headline: "Volle Kontrolle, sauberes Setup",
    points: [
      "Untis-Import in 5 Minuten — nicht in 5 Tagen",
      "DSGVO-konform aus Deutschland, AVV in 24 h",
      "SSO mit Microsoft/Google, SCIM-Provisioning",
      "Reporting für Schulträger und Eltern-Beirat",
    ],
  },
  {
    role: "Eltern",
    emoji: "👨‍👩‍👧",
    accent: "purple",
    tabActive: "bg-violet-50 text-violet-600 border-b-2 border-violet-500",
    tabIdle: "text-muted-fg hover:text-fg hover:bg-surface",
    checkColor: "text-violet-500",
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-700",
    headline: "Endlich überblickbar",
    points: [
      "Eine App für alle Kinder — Noten, Termine, Nachrichten",
      "Krankmeldung mit zwei Klicks (signiert, prüfbar)",
      "Push, wenn wirklich was Wichtiges passiert",
      "Kein Klassen-Chat-Chaos mehr",
    ],
  },
];

export function UseCases() {
  const [activeTab, setActiveTab] = useState(0);
  const current = audiences[activeTab];

  return (
    <section id="fuer-schulen" className="border-b border-border section bg-surface">
      <Container>
        <AnimateOnScroll animation="fade-up" className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Für jede Rolle</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">
            Eine Plattform.
            <br />
            Vier echte Workflows.
          </h2>
        </AnimateOnScroll>

        {/* Tab buttons */}
        <AnimateOnScroll animation="fade-up" delay={100}>
          <div className="mt-12 flex justify-center">
            <div className="inline-flex rounded-2xl border border-border bg-bg p-1.5 gap-1">
              {audiences.map((a, i) => (
                <button
                  key={a.role}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150",
                    activeTab === i ? a.tabActive : a.tabIdle
                  )}
                >
                  <span className="mr-1.5">{a.emoji}</span>
                  {a.role}
                </button>
              ))}
            </div>
          </div>
        </AnimateOnScroll>

        {/* Tab content */}
        <AnimateOnScroll animation="fade-up" delay={200}>
        <div className="mt-8 mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            <div className="flex flex-col sm:flex-row">
              {/* Left: emoji illustration */}
              <div
                className={cn(
                  "flex items-center justify-center sm:w-52 shrink-0 py-10 sm:py-0 rounded-t-3xl sm:rounded-t-none sm:rounded-l-3xl",
                  current.badgeBg
                )}
              >
                <span className="text-7xl">{current.emoji}</span>
              </div>

              {/* Right: content */}
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <span
                  className={cn(
                    "inline-block self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest",
                    current.badgeBg,
                    current.badgeText
                  )}
                >
                  Für {current.role}
                </span>
                <h3 className="mt-3 text-2xl font-bold tracking-tight">
                  {current.headline}
                </h3>
                <ul className="mt-6 space-y-3">
                  {current.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={cn("mt-0.5 size-4 shrink-0", current.checkColor)}
                        strokeWidth={2.5}
                      />
                      <span className="text-muted-fg">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
