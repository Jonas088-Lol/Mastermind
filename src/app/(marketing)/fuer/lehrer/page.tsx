import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Sparkles,
  BarChart2,
  Users,
  Bell,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Für Lehrer | MasterMind",
  description:
    "MasterMind für Lehrkräfte: Aufgaben erstellen, KI-Vorkorrektur, Notenmanagement, Klassenanalyse und Broadcast — weniger Verwaltung, mehr Unterricht.",
};

const sections = [
  {
    icon: ClipboardList,
    title: "Aufgaben erstellen — in Minuten",
    bullets: [
      "Hausaufgaben, Tests und Projekte mit wenigen Klicks erstellen",
      "KI-Aufgaben-Generator: Thema eingeben, fertige Aufgabe erhalten",
      "Datei-Uploads, Textabgaben und interaktive Quiz-Formate",
    ],
  },
  {
    icon: Sparkles,
    title: "KI-Vorkorrektur",
    bullets: [
      "KI bewertet Abgaben nach deinen Kriterien vor — du hast die Endkontrolle",
      "Automatische Rückmeldungs-Texte für jeden Schüler individualisiert",
      "Spart durchschnittlich 60 % der Korrekturzeit",
    ],
  },
  {
    icon: BarChart2,
    title: "Notenmanagement",
    bullets: [
      "Alle Noten zentral erfassen — schriftlich, mündlich, praktisch",
      "Gewichtung und Notenschlüssel frei konfigurierbar",
      "Export als PDF, Excel oder direkt ins Zeugnis-System",
    ],
  },
  {
    icon: Users,
    title: "Klassenanalyse",
    bullets: [
      "Kompetenz-Heatmap zeigt Lernlücken in der Klasse auf einen Blick",
      "Differenzierung leicht gemacht: Gruppen nach Leistungsstand filtern",
      "Lernfortschritt im Zeitverlauf — vor und nach einer Unterrichtseinheit",
    ],
  },
  {
    icon: Bell,
    title: "Broadcast & Kommunikation",
    bullets: [
      "Klassen-Nachrichten und Erinnerungen per Push oder E-Mail",
      "Eltern-Kommunikation DSGVO-konform direkt in MasterMind",
      "Automatische Reminder 2 Stunden vor Abgabeschluss",
    ],
  },
];

export default function FuerLehrerPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border section">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              <span className="inline-block size-1.5 bg-brand" />
              Für Lehrer
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl">
              Weniger Verwaltung, mehr Unterricht
            </h1>
            <p className="mt-5 text-lg text-muted-fg">
              MasterMind nimmt Lehrkräften den Papierkram ab. Aufgaben, Korrekturen,
              Noten und Kommunikation — alles an einem Ort, mit KI-Unterstützung.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/kontakt">
                <Button size="lg" className="glow-on-hover">
                  Demo buchen
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
            <h2 className="text-3xl sm:text-4xl">Bereit, Zeit zu sparen?</h2>
            <p className="mt-4 text-lg text-muted-fg">
              Sprich deine Schulleitung an oder buche direkt eine persönliche Demo.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/kontakt">
                <Button size="lg" className="glow-on-hover">
                  Persönliche Demo buchen
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
    </>
  );
}
