"use client";

import { useState } from "react";
import { Check, GraduationCap, BookOpen, Building2, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { AnimateOnScroll } from "./AnimateOnScroll";

const RAINBOW = "linear-gradient(to right, #2FC5E7, #4B9EF5, #8B5CF6, #EC4899, #F97316, #10B981)";

const audiences: {
  role: string;
  Icon: LucideIcon;
  rainbowPos: number;
  tabActive: string;
  tabIdle: string;
  headline: string;
  points: string[];
}[] = [
  {
    role: "Schüler",
    Icon: GraduationCap,
    rainbowPos: 0,
    tabActive: "bg-brand/10 text-brand border-b-2 border-brand",
    tabIdle: "text-muted-fg hover:text-fg hover:bg-surface",
    headline: "Lernen, das wirklich hängen bleibt",
    points: [
      "KI-Tutor erklärt jede Aufgabe Schritt für Schritt",
      "Karteikarten mit Spaced-Repetition für Klausuren",
      "Streaks und Lerngruppen halten dich am Ball",
    ],
  },
  {
    role: "Lehrer",
    Icon: BookOpen,
    rainbowPos: 2,
    tabActive: "bg-brand/10 text-brand border-b-2 border-brand",
    tabIdle: "text-muted-fg hover:text-fg hover:bg-surface",
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
    Icon: Building2,
    rainbowPos: 4,
    tabActive: "bg-brand/10 text-brand border-b-2 border-brand",
    tabIdle: "text-muted-fg hover:text-fg hover:bg-surface",
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
    Icon: Users,
    rainbowPos: 5,
    tabActive: "bg-brand/10 text-brand border-b-2 border-brand",
    tabIdle: "text-muted-fg hover:text-fg hover:bg-surface",
    headline: "Endlich überblickbar",
    points: [
      "Eine App für alle Kinder — Noten, Termine, Nachrichten",
      "Krankmeldung mit zwei Klicks (signiert, prüfbar)",
      "Push, wenn wirklich was Wichtiges passiert",
      "Kein Klassen-Chat-Chaos mehr",
    ],
  },
];

function iconPanelStyle(pos: number): React.CSSProperties {
  return {
    background: RAINBOW,
    backgroundSize: "600% 100%",
    backgroundPosition: `${pos * 20}% 0%`,
  };
}

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
            <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-bg p-1.5 sm:inline-flex sm:w-auto sm:flex-row">
              {audiences.map((a, i) => (
                <button
                  key={a.role}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 sm:px-4",
                    activeTab === i ? a.tabActive : a.tabIdle
                  )}
                >
                  <a.Icon className="size-4 shrink-0" strokeWidth={1.75} />
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
                {/* Left: icon illustration with rainbow gradient */}
                <div
                  className="flex items-center justify-center sm:w-52 shrink-0 py-10 sm:py-0 rounded-t-3xl sm:rounded-t-none sm:rounded-l-3xl"
                  style={iconPanelStyle(current.rainbowPos)}
                >
                  <current.Icon className="size-20 text-white" strokeWidth={1.25} />
                </div>

                {/* Right: content */}
                <div className="flex flex-col justify-center p-7 sm:p-10">
                  <span className="inline-block self-start rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand">
                    Für {current.role}
                  </span>
                  <h3 className="mt-3 text-2xl font-bold tracking-tight">
                    {current.headline}
                  </h3>
                  <ul className="mt-6 space-y-3">
                    {current.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-brand"
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
