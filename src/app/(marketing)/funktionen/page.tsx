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
    color: "text-brand bg-brand/10",
    title: "KI-Tutor",
    bullets: [
      "Personalisierte Erklärungen passend zum Lernstand",
      "Jederzeit sofort verständliche Antworten und Erklärungen",
      "Jede KI-Anfrage wird pseudonymisiert",
    ],
  },
  {
    icon: ClipboardList,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
    title: "Aufgaben-Management",
    bullets: [
      "Hausaufgaben, Tests und Projekte auf einen Blick",
      "Automatische Vorkorrekturen entlasten Lehrkräfte",
      "Automatische Erinnerungen vor jeder Abgabe",
    ],
  },
  {
    icon: BarChart2,
    color: "text-sky-500 bg-sky-50 dark:bg-sky-950/30",
    title: "Notenübersicht",
    bullets: [
      "Zentrale Übersicht für alle Noten und Bewertungen",
      "Die Notenentwicklung graphisch auf einen Blick verfolgen",
      "Kompetenzen übersichtlich visualisieren",
    ],
  },
  {
    icon: Trophy,
    color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
    title: "Gamification",
    bullets: [
      "Fortschritte werden mit Erfahrungspunkten belohnt",
      "Tagesstreaks fördern regelmäßige Lerngewohnheiten",
      "Klassen-Duelle fördern Motivation und Teamgeist",
    ],
  },
  {
    icon: BookOpen,
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
    title: "Hefte & Karteikarten",
    bullets: [
      "Digitale Hefte für jedes Unterrichtsfach",
      "Passende Hefteinträge direkt mit Übungen verknüpft",
      "Intelligente Wiederholungen für nachhaltiges Lernen",
    ],
  },
  {
    icon: Users,
    color: "text-pink-500 bg-pink-50 dark:bg-pink-950/30",
    title: "Eltern-Kommunikation",
    bullets: [
      "Krankmeldungen in wenigen Klicks übermitteln",
      "Elterngespräche mit wenigen Klicks online buchen",
      "Rechtzeitig an wichtige Abgaben erinnert werden",
    ],
  },
  {
    icon: School,
    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30",
    title: "Klassenmanagement",
    bullets: [
      "Stundenpläne flexibel importieren oder erstellen",
      "Wichtige Informationen mit einem Klick versenden",
      "Nutzer mit wenigen Klicks einladen",
    ],
  },
  {
    icon: ShieldCheck,
    color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30",
    title: "DSGVO-konform",
    bullets: [
      "Sichere Datenhaltung auf Servern in Deutschland",
      "Datenschutzdokumente ohne lange Wartezeiten",
      "Kein Tracking, kein Datenverkauf",
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
            <span className="eyebrow">Funktionen</span>
            <h1 className="mt-4 text-4xl sm:text-5xl">
              Eine Plattform.
              <br />
              Für modernes Lernen.
            </h1>
            <p className="mt-5 text-lg text-muted-fg">
              MasterMind vereint Lernen, Kommunikation, Schulverwaltung, künstliche
              Intelligenz und digitale Werkzeuge auf einer zentralen Plattform.
              Entwickelt für Schüler, Lehrkräfte und Schulleitungen. Alles, was der
              Schulalltag braucht.
            </p>
          </div>
        </Container>
      </section>

      {/* Feature grid */}
      <section className="border-b border-border section">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map((f) => (
              <article
                key={f.title}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className={`inline-grid size-11 shrink-0 place-items-center rounded-2xl ${f.color}`}>
                    <f.icon className="size-5" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-base font-bold leading-snug">{f.title}</h2>
                </div>
                <ul className="space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-fg">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
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
