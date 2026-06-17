"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Brain, Sparkles, CalendarDays, MessageSquare, BarChart2, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimateOnScroll } from "./AnimateOnScroll";

// Single rainbow gradient across the page — each card shows its slice
// 6 cards → background-size: 600%, positions stepped by 20% each
const RAINBOW = "linear-gradient(to right, #2FC5E7, #4B9EF5, #8B5CF6, #EC4899, #F97316, #10B981)";
function headerStyle(index: number): React.CSSProperties {
  return {
    background: RAINBOW,
    backgroundSize: "600% 100%",
    backgroundPosition: `${index * 20}% 0%`,
  };
}

// Accent colors matching the rainbow position of each card
const ACCENTS = ["#2FC5E7", "#4B9EF5", "#8B5CF6", "#EC4899", "#F97316", "#10B981"] as const;

const features: {
  id: string;
  Icon: LucideIcon;
  textAccent: string;
  title: string;
  tagline: string;
  body: string;
  mockup: "learning" | "task" | "schedule" | "comms" | "heatmap" | "game";
}[] = [
  {
    id: "lernpfade",
    Icon: Brain,
    textAccent: ACCENTS[0],
    title: "Adaptive Lernpfade",
    tagline: "KI erkennt, wo du stehst",
    body: "KI erkennt Schwächen und passt den Stoff an. Spaced-Repetition für nachhaltiges Lernen statt Bulimie.",
    mockup: "learning",
  },
  {
    id: "aufgaben",
    Icon: Sparkles,
    textAccent: ACCENTS[1],
    title: "KI-Aufgaben-Generator",
    tagline: "Klassenarbeit in 3 Minuten",
    body: "Lehrer erstellen Klassenarbeiten in Minuten. Niveaustufen, Lernziel-Mapping, automatische Korrektur-Hinweise.",
    mockup: "task",
  },
  {
    id: "stundenplan",
    Icon: CalendarDays,
    textAccent: ACCENTS[2],
    title: "Stundenplan & Vertretung",
    tagline: "Untis-Import in 5 Minuten",
    body: "Untis-Import in 5 Minuten. Vertretungsplan, Klassenbuch, Fehlzeiten — alles digital, alles synchron.",
    mockup: "schedule",
  },
  {
    id: "kommunikation",
    Icon: MessageSquare,
    textAccent: ACCENTS[3],
    title: "Klare Kommunikation",
    tagline: "Kein Mail-Chaos mehr",
    body: "Kanäle pro Klasse, Eltern-Bereich, Krankmeldungen mit Signatur. Kein Mail-Chaos mehr.",
    mockup: "comms",
  },
  {
    id: "heatmap",
    Icon: BarChart2,
    textAccent: ACCENTS[4],
    title: "Kompetenz-Heatmaps",
    tagline: "Klassen-Überblick in 30 Sek",
    body: "Jeder Lehrer sieht in 30 Sekunden, wo die Klasse steht — pro Schüler, pro Lernziel, pro Lehrplan-Code.",
    mockup: "heatmap",
  },
  {
    id: "gamification",
    Icon: Trophy,
    textAccent: ACCENTS[5],
    title: "Gamification mit Sinn",
    tagline: "XP, Badges, echte Motivation",
    body: "XP, Streaks, Badges — gekoppelt an echten Lernfortschritt, nicht an Login-Häufigkeit.",
    mockup: "game",
  },
];

type MockupKey = "learning" | "task" | "schedule" | "comms" | "heatmap" | "game";

function MockupPreview({ mockup }: { mockup: MockupKey }) {
  switch (mockup) {
    case "learning":
      return (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span>📖</span>
            <p className="text-sm font-semibold">Thema: Quadratische Gleichungen</p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-fg">
              <span>Fortschritt</span>
              <span className="font-bold text-blue-600">73 %</span>
            </div>
            <div className="h-2 rounded-full bg-blue-100">
              <div className="h-2 w-[73%] rounded-full bg-blue-500" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Karteikarte 1", "Karteikarte 2", "Karteikarte 3"].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      );

    case "task":
      return (
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 space-y-3">
          <textarea
            readOnly
            className="w-full resize-none rounded-xl border border-violet-200 bg-white p-3 text-xs text-fg focus:outline-none"
            rows={2}
            value="Erstelle 5 Aufgaben zu quadratischen Gleichungen für Klasse 9..."
          />
          <button
            type="button"
            className="w-full rounded-xl bg-violet-600 py-2 text-xs font-bold text-white"
          >
            ✨ Generieren
          </button>
          <div className="space-y-2">
            {["Aufgabe 1: Löse x² – 5x + 6 = 0", "Aufgabe 2: Bestimme die Nullstellen…"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs text-fg"
                >
                  {item}
                </div>
              )
            )}
          </div>
        </div>
      );

    case "schedule":
      return (
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
          <div className="grid grid-cols-3 gap-2">
            {["Mo", "Di", "Mi"].map((day) => (
              <div key={day} className="space-y-2">
                <p className="text-center text-xs font-bold text-sky-700">{day}</p>
                {(
                  day === "Mo"
                    ? ["Mathe", "Deutsch", "Sport"]
                    : day === "Di"
                    ? ["Englisch", "Bio", "Physik"]
                    : ["Kunst", "Mathe", "Geschichte"]
                ).map((subj) => (
                  <div
                    key={subj}
                    className="rounded-lg bg-white border border-sky-200 px-2 py-1.5 text-center text-[11px] font-medium text-sky-800"
                  >
                    {subj}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );

    case "comms":
      return (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white border border-emerald-200 px-3 py-2">
              <p className="text-[11px] font-semibold text-emerald-700">Frau Müller (Lehrerin)</p>
              <p className="text-xs text-fg mt-0.5">Klausur nächste Woche: Themen 5–8. Lernzettel im Kurs.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-600 px-3 py-2">
              <p className="text-[11px] font-semibold text-emerald-100">Elternteil</p>
              <p className="text-xs text-white mt-0.5">Lukas ist heute krank. Krankmeldung anhängen ✓</p>
            </div>
          </div>
        </div>
      );

    case "heatmap":
      return (
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <p className="mb-3 text-xs font-bold text-orange-700">Klasse 9b — Lernstand</p>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              "bg-green-400", "bg-green-500", "bg-yellow-400", "bg-green-300", "bg-red-400",
              "bg-yellow-300", "bg-green-400", "bg-green-500", "bg-red-300", "bg-yellow-400",
              "bg-green-500", "bg-red-400", "bg-yellow-300", "bg-green-400", "bg-green-500",
              "bg-red-300", "bg-yellow-500", "bg-green-400", "bg-green-300", "bg-red-400",
              "bg-green-400", "bg-green-500", "bg-yellow-400", "bg-red-300", "bg-green-500",
            ].map((color, i) => (
              <div key={i} className={cn("h-7 w-full rounded-md", color)} />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-fg">
            <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-green-400" /> Sicher</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-yellow-400" /> Unsicher</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-red-400" /> Lücke</span>
          </div>
        </div>
      );

    case "game":
      return (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🥈</span>
            <div>
              <p className="text-xs font-bold text-rose-700">Silber III</p>
              <div className="mt-1 h-2 w-32 rounded-full bg-rose-200">
                <div className="h-2 w-[60%] rounded-full bg-rose-500" />
              </div>
              <p className="mt-0.5 text-[10px] text-muted-fg">1.820 / 3.000 XP bis Gold I</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { done: true, label: "5 Übungen abgeschlossen" },
              { done: true, label: "Streak aufrechterhalten" },
              { done: false, label: "10 Karteikarten wiederholt" },
            ].map((q) => (
              <div key={q.label} className="flex items-center gap-2 rounded-xl bg-white border border-rose-200 px-3 py-2">
                <div className={cn("size-4 rounded-full border-2 grid place-items-center shrink-0", q.done ? "bg-rose-500 border-rose-500" : "border-rose-300")}>
                  {q.done && <span className="text-[9px] text-white font-bold">✓</span>}
                </div>
                <p className="text-xs text-fg">{q.label}</p>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function FeatureShowcase() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const prev = useCallback(() =>
    setActiveIndex((i) => (i === null ? 0 : (i - 1 + features.length) % features.length)), []);
  const next = useCallback(() =>
    setActiveIndex((i) => (i === null ? 0 : (i + 1) % features.length)), []);

  useEffect(() => {
    if (activeIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, close, prev, next]);

  // Lock scroll when modal open
  useEffect(() => {
    if (activeIndex !== null) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [activeIndex]);

  const active = activeIndex !== null ? features[activeIndex] : null;

  return (
    <section id="funktionen" className="section">
      <div className="container-px mx-auto max-w-7xl">
        <AnimateOnScroll animation="fade-up" className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Funktionen</span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl">
            Drei Tools.
            <br />
            Eine Plattform.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-fg sm:text-lg">
            Schluss mit unnötig vielen Apps zum Lernen. MasterMind bündelt
            alles, was eine moderne Schule braucht.
          </p>
        </AnimateOnScroll>

        {/* Card grid */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <AnimateOnScroll
              key={f.id}
              animation="fade-up"
              delay={i * 80}
            >
              <button
                type="button"
                onClick={() => setActiveIndex(i)}
                className="group w-full rounded-2xl border border-border bg-surface text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {/* Rainbow gradient header — each card shows its slice of the full rainbow */}
                <div
                  className="flex h-20 items-center justify-center rounded-t-2xl"
                  style={headerStyle(i)}
                >
                  <div className="grid size-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <f.Icon className="size-6 text-white" strokeWidth={1.75} />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5">
                  <h3 className="text-base font-bold">{f.title}</h3>
                  <p className="mt-0.5 text-xs font-semibold" style={{ color: f.textAccent }}>{f.tagline}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-fg line-clamp-2">
                    {f.body}
                  </p>
                  <p className="mt-4 text-xs font-semibold" style={{ color: f.textAccent }}>
                    Details anzeigen →
                  </p>
                </div>
              </button>
            </AnimateOnScroll>
          ))}
        </div>
      </div>

      {/* Modal */}
      {active !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal gradient header — shows the card's rainbow slice */}
            <div
              className="relative flex h-40 items-center justify-center rounded-t-3xl"
              style={headerStyle(activeIndex!)}
            >
              <div className="grid size-20 place-items-center rounded-3xl bg-white/20 backdrop-blur-sm">
                {active.Icon && <active.Icon className="size-10 text-white" strokeWidth={1.5} />}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Schließen"
                className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 sm:p-8">
              <h3 className="text-2xl font-bold">{active.title}</h3>
              <p className="mt-1 text-sm font-semibold" style={{ color: active.textAccent }}>
                {active.tagline}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-fg">{active.body}</p>

              {/* Mockup preview */}
              <div className="mt-6">
                <MockupPreview mockup={active.mockup} />
              </div>

              {/* Navigation */}
              <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                <button
                  type="button"
                  onClick={prev}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface"
                >
                  <ChevronLeft className="size-4" />
                  Zurück
                </button>

                <span className="text-xs font-medium text-muted-fg">
                  {activeIndex! + 1} von {features.length}
                </span>

                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface"
                >
                  Weiter
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
