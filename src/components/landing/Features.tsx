/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  Brain,
  CalendarDays,
  GraduationCap,
  LineChart,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { AnimateOnScroll } from "./AnimateOnScroll";

const features = [
  {
    icon: Brain,
    color: "text-brand bg-brand/10",
    title: "Adaptive Lernpfade",
    body: "KI erkennt Schwächen und passt den Stoff an. Spaced-Repetition für nachhaltiges Lernen statt Bulimie.",
  },
  {
    icon: Sparkles,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
    title: "KI-Aufgaben-Generator",
    body: "Lehrer erstellen Klassenarbeiten in Minuten. Niveaustufen, Lernziel-Mapping, automatische Korrektur-Hinweise.",
  },
  {
    icon: CalendarDays,
    color: "text-sky-500 bg-sky-50 dark:bg-sky-950/30",
    title: "Stundenplan & Vertretung",
    body: "Untis-Import in 5 Minuten. Vertretungsplan, Klassenbuch, Fehlzeiten — alles digital, alles synchron.",
  },
  {
    icon: MessageSquare,
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
    title: "Klare Kommunikation",
    body: "Kanäle pro Klasse, Eltern-Bereich, Krankmeldungen mit Signatur. Kein Mail-Chaos mehr.",
  },
  {
    icon: LineChart,
    color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
    title: "Kompetenz-Heatmaps",
    body: "Jeder Lehrer sieht in 30 Sekunden, wo die Klasse steht — pro Schüler, pro Lernziel, pro Lehrplan-Code.",
  },
  {
    icon: GraduationCap,
    color: "text-pink-500 bg-pink-50 dark:bg-pink-950/30",
    title: "Gamification mit Sinn",
    body: "XP, Streaks, Badges — gekoppelt an echten Lernfortschritt, nicht an Login-Häufigkeit.",
  },
];

export function Features() {
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
            Schluss mit unnötig vielen Apps zum Lernen.
            MasterMind bündelt alles, was eine moderne Schule braucht.
          </p>
        </AnimateOnScroll>

        <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <AnimateOnScroll
              key={f.title}
              animation="fade-up"
              delay={i * 90}
              className="card-elevated group p-6 sm:p-7"
            >
              <div className={`inline-grid size-11 place-items-center rounded-2xl ${f.color}`}>
                <f.icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-base font-bold sm:text-lg">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-fg">
                {f.body}
              </p>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
