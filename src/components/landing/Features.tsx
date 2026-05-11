import {
  Brain,
  CalendarDays,
  GraduationCap,
  LineChart,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/ui/container";

const features = [
  {
    icon: Brain,
    title: "Adaptive Lernpfade",
    body: "KI erkennt Schwächen und passt den Stoff an. Spaced-Repetition für nachhaltiges Lernen statt Bulimie.",
  },
  {
    icon: Sparkles,
    title: "KI-Aufgaben-Generator",
    body: "Lehrer erstellen Klassenarbeiten in Minuten. Niveaustufen, Lernziel-Mapping, automatische Korrektur-Hinweise.",
  },
  {
    icon: CalendarDays,
    title: "Stundenplan & Vertretung",
    body: "Untis-Import in 5 Minuten. Vertretungsplan, Klassenbuch, Fehlzeiten — alles digital, alles synchron.",
  },
  {
    icon: MessageSquare,
    title: "Klare Kommunikation",
    body: "Kanäle pro Klasse, Eltern-Bereich, Krankmeldungen mit Signatur. Kein Mail-Chaos mehr.",
  },
  {
    icon: LineChart,
    title: "Kompetenz-Heatmaps",
    body: "Jeder Lehrer sieht in 30 Sekunden, wo die Klasse steht — pro Schüler, pro Lernziel, pro Lehrplan-Code.",
  },
  {
    icon: GraduationCap,
    title: "Gamification mit Sinn",
    body: "XP, Streaks, Badges — gekoppelt an echten Lernfortschritt, nicht an Login-Häufigkeit.",
  },
];

export function Features() {
  return (
    <section id="funktionen" className="border-b border-border section">
      <Container>
        <div className="max-w-2xl">
          <span className="eyebrow">Funktionen</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">
            Drei Tools.
            <br />
            Eine Plattform.
          </h2>
          <p className="mt-5 text-lg text-muted-fg">
            Schluss mit unnötig vielen Apps zum Lernen.
            MasterMind bündelt alles, was eine moderne Schule braucht — ohne Feature-Aufblähung.
          </p>
        </div>

        <div className="mt-16 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="bg-bg p-7 transition-colors hover:bg-surface"
            >
              <f.icon className="size-6 text-brand" strokeWidth={1.5} />
              <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-fg">
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
