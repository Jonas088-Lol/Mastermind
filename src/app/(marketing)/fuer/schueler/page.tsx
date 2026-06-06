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
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Fur Schuler | MasterMind",
  description:
    "MasterMind fur Schuler: KI-Tutor, Gamification, Lernpfade, Karteikarten und Notentracking — lerne smarter, nicht harter.",
};

const sections = [
  {
    icon: Brain,
    title: "KI-Tutor — Erklarungen auf Knopfdruck",
    bullets: [
      "Frag den KI-Tutor jederzeit — er erklart Aufgaben Schritt fur Schritt",
      "Anpassung an deinen Wissensstand: einfachere oder tiefere Erklarungen",
      "Verfugbar fur alle Facher: Mathe, Deutsch, Englisch, Physik und mehr",
    ],
  },
  {
    icon: Trophy,
    title: "Gamification — Lernen mit Spass",
    bullets: [
      "Sammle XP fur jede abgeschlossene Aufgabe und jedes Quiz",
      "Halte deinen Tagesstreak am Laufen — bis zu ×2 XP-Booster",
      "Fordere Mitschuler zu Wissensduellen heraus und klettere in der Rangliste",
    ],
  },
  {
    icon: Layers,
    title: "Personalisierte Lernpfade",
    bullets: [
      "MasterMind erkennt, wo du Lucken hast, und schlagt das richtige Thema vor",
      "Spaced Repetition sorgt fur nachhaltiges Merken statt kurzzeitigem Bulimie-Lernen",
      "Fortschrittsanzeige pro Fach und Lernziel — immer weisst du, wo du stehst",
    ],
  },
  {
    icon: BookOpen,
    title: "Karteikarten-System",
    bullets: [
      "Erstelle Karteikarten direkt aus deinen Heften oder vom KI-Tutor generiert",
      "Automatische Wiederholungs-Intervalle nach Lernstand",
      "Vokabel-Trainer mit Bild- und Ton-Unterstutzung",
    ],
  },
  {
    icon: BarChart2,
    title: "Notentracking",
    bullets: [
      "Alle Noten auf einen Blick — nach Fach sortiert und als Zeitreihe",
      "Durchschnitts-Berechnung und Prognosefunktion fur die nachste Arbeit",
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
              Fur Schuler
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl">
              Lerne smarter, nicht harter
            </h1>
            <p className="mt-5 text-lg text-muted-fg">
              MasterMind gibt dir einen KI-Tutor, der immer Zeit hat, Gamification die
              motiviert und Lernpfade die wirklich funktionieren — alles in einer App.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/kontakt">
                <Button size="lg" className="glow-on-hover">
                  Demo ansehen
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/funktionen">
                <Button size="lg" variant="outline">
                  Alle Funktionen
                </Button>
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
                {/* Text */}
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

                {/* Placeholder mockup */}
                <div className="flex-1">
                  <div className="flex aspect-video w-full items-center justify-center border border-border bg-surface text-sm text-muted-fg">
                    Screenshot Platzhalter — {s.title}
                  </div>
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
              Sprich deine Lehrkrafte an oder fordere eine Demo fur deine Schule an.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/kontakt">
                <Button size="lg" className="glow-on-hover">
                  Demo fur meine Schule
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
