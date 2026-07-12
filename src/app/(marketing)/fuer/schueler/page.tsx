/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Trophy,
  BookOpen,
  BarChart2,
  Layers,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { FeatureMockup } from "@/components/marketing/FeatureMockup";

type MockupKey = "chat" | "dashboard" | "grades" | "flashcard" | "assignment" | "analytics" | "admin" | "security" | "learning";

export const metadata: Metadata = {
  title: "Für Schüler | MasterMind",
  description:
    "MasterMind für Schüler: KI-Tutor, Gamification, Lernpfade, Karteikarten und Notentracking — lerne smarter, nicht härter.",
};

const sections: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; bullets: string[]; mockup: MockupKey }[] = [
  {
    icon: Brain,
    title: "KI-Tutor — Erklärungen auf Knopfdruck",
    mockup: "chat",
    bullets: [
      "Frag den KI-Tutor jederzeit — er erklärt Aufgaben Schritt für Schritt",
      "Anpassung an deinen Wissensstand: einfachere oder tiefere Erklärungen",
      "Verfügbar für alle Fächer: Mathe, Deutsch, Englisch, Physik und mehr",
    ],
  },
  {
    icon: Trophy,
    title: "Gamification — Lernen mit Spaß",
    mockup: "dashboard",
    bullets: [
      "Sammle XP für jede abgeschlossene Aufgabe und jedes Quiz",
      "Halte deinen Tagesstreak am Laufen — bis zu ×2 XP-Booster",
      "Fordere Mitschüler zu Wissensduellen heraus und klettere in der Rangliste",
    ],
  },
  {
    icon: Layers,
    title: "Personalisierte Lernpfade",
    mockup: "learning",
    bullets: [
      "MasterMind erkennt, wo du Lücken hast, und schlägt das richtige Thema vor",
      "Spaced Repetition sorgt für nachhaltiges Merken statt kurzfristigem Bulimie-Lernen",
      "Fortschrittsanzeige pro Fach und Lernziel — du weißt immer, wo du stehst",
    ],
  },
  {
    icon: BookOpen,
    title: "Karteikarten-System",
    mockup: "flashcard",
    bullets: [
      "Erstelle Karteikarten direkt aus deinen Heften oder vom KI-Tutor generiert",
      "Automatische Wiederholungs-Intervalle nach Lernstand",
      "Vokabel-Trainer mit Bild- und Ton-Unterstützung",
    ],
  },
  {
    icon: BarChart2,
    title: "Notentracking",
    mockup: "grades",
    bullets: [
      "Alle Noten auf einen Blick — nach Fach sortiert und als Zeitreihe",
      "Durchschnitts-Berechnung und Prognosefunktion für die nächste Arbeit",
      "Teile deinen Fortschritt mit deinen Eltern — auf Wunsch",
    ],
  },
];

export default function FuerSchuelerPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border section">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              <span className="inline-block size-1.5 bg-brand" />
              Für Schüler
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl">
              Lerne smarter, nicht härter
            </h1>
            <p className="mt-5 text-lg text-muted-fg">
              MasterMind gibt dir einen KI-Tutor, der immer Zeit hat, Gamification die
              motiviert, und Lernpfade, die wirklich funktionieren — alles in einer App.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/kontakt"
                className={buttonVariants({ size: "lg", className: "glow-on-hover" })}
              >
                Demo ansehen
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/funktionen"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Alle Funktionen
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Sections */}
      <section className="border-b border-border section">
        <Container>
          <div className="flex flex-col gap-16">
            {sections.map((s, i) => (
              <div
                key={s.title}
                className={`flex flex-col gap-8 md:flex-row md:items-start ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center border border-border bg-surface">
                      <s.icon className="size-5 text-brand" strokeWidth={1.75} />
                    </div>
                    <h2 className="text-2xl font-bold">{s.title}</h2>
                  </div>
                  <ul className="space-y-3">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm text-muted-fg">
                        <span className="mt-1.5 size-1.5 shrink-0 bg-brand" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1">
                  <FeatureMockup variant={s.mockup} />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="section">
        <Container>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl sm:text-4xl">Deine Schule noch nicht dabei?</h2>
            <p className="mt-4 text-lg text-muted-fg">
              Sprich deine Lehrkräfte an oder fordere eine Demo für deine Schule an.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/kontakt"
                className={buttonVariants({ size: "lg", className: "glow-on-hover" })}
              >
                Demo für meine Schule
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
