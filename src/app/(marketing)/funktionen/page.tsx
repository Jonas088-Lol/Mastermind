import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  ClipboardList,
  BarChart2,
  Trophy,
  BookOpen,
  Users,
  ShieldCheck,
  School,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Funktionen | MasterMind",
  description:
    "Alle Funktionen von MasterMind auf einen Blick — KI-Tutor, Aufgaben-Management, Gamification, Hefte, Eltern-Kommunikation und mehr.",
};

const features = [
  {
    icon: Brain,
    title: "KI-Tutor",
    bullets: [
      "Personalisierte Erklarungen je nach Wissensstand",
      "Sofortige Antworten auf Fragen — rund um die Uhr",
      "Adaptives Frage-Antwort-Training mit Spaced Repetition",
    ],
  },
  {
    icon: ClipboardList,
    title: "Aufgaben-Management",
    bullets: [
      "Hausaufgaben, Tests und Projekte in einer Ansicht",
      "KI-Vorkorrektur spart Lehrkraften bis zu 60 % Zeit",
      "Automatische Erinnerungen fur Schuler vor Abgabeschluss",
    ],
  },
  {
    icon: BarChart2,
    title: "Notenuebersicht",
    bullets: [
      "Kompetenz-Heatmap pro Schuler und Lernziel",
      "Notenentwicklung als Zeitreihe visualisiert",
      "Export als PDF fur Elterngesprache",
    ],
  },
  {
    icon: Trophy,
    title: "Gamification — XP, Streaks & Duelle",
    bullets: [
      "Erfahrungspunkte fur jede abgeschlossene Aufgabe",
      "Tagesstreaks motivieren zu regelmaßigem Lernen",
      "Klassen-Duelle und Ranglisten fur gesunden Wettbewerb",
    ],
  },
  {
    icon: BookOpen,
    title: "Hefte & Karteikarten",
    bullets: [
      "Block-Editor mit Mathe-Formeln, Tabellen und Zeichnen",
      "Karteikarten-System mit automatischer Wiederholung",
      "Hefte pro Fach — direkt mit Ubungen verknupft",
    ],
  },
  {
    icon: Users,
    title: "Eltern-Kommunikation",
    bullets: [
      "Krankmeldungen digital mit Unterschrift",
      "Push-Benachrichtigungen fur neue Aufgaben und Noten",
      "Elterngesprach-Buchung direkt in der App",
    ],
  },
  {
    icon: School,
    title: "Klassenmanagement",
    bullets: [
      "Stundenplan-Import aus Untis in 5 Minuten",
      "Digitales Klassenbuch mit Fehlzeiten-Tracking",
      "Vertretungsplan automatisch synchronisiert",
    ],
  },
  {
    icon: ShieldCheck,
    title: "DSGVO-konform",
    bullets: [
      "Hosting ausschliesslich auf Servern in Frankfurt am Main",
      "AVV-Abschluss innerhalb von 24 Stunden",
      "Kein Tracking, keine Werbung, kein Datenverkauf",
    ],
  },
];

export default function FunktionenPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border section">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              <span className="inline-block size-1.5 bg-brand" />
              Funktionen
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl">
              Alles was Schulen brauchen — in einer Plattform
            </h1>
            <p className="mt-5 text-lg text-muted-fg">
              MasterMind vereint Lern-App, Schulverwaltung und KI-Tutor. Keine fuenf
              verschiedenen Tools — eine Plattform, die fur Schuler, Lehrkrafte und
              Schulleitungen funktioniert.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="glow-on-hover">
                  Kostenlos testen
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/preise">
                <Button size="lg" variant="outline">
                  Preise ansehen
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Feature grid */}
      <section className="border-b border-border section">
        <Container>
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map((f) => (
              <article
                key={f.title}
                className="flex flex-col gap-4 bg-bg p-7 transition-colors hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center border border-border bg-surface">
                    <f.icon className="size-4 text-brand" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-base font-bold leading-snug">{f.title}</h2>
                </div>
                <ul className="space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-fg">
                      <span className="mt-1.5 size-1.5 shrink-0 bg-brand" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="section">
        <Container>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl sm:text-4xl">Bereit, MasterMind auszuprobieren?</h2>
            <p className="mt-4 text-lg text-muted-fg">
              30 Tage kostenlos — keine Kreditkarte, kein Risiko.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="glow-on-hover">
                  Schule kostenlos testen
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/kontakt">
                <Button size="lg" variant="outline">
                  Demo buchen
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
