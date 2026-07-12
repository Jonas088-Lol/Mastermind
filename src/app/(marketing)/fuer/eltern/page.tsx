/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  CalendarClock,
  Bell,
  ShieldCheck,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { FeatureMockup } from "@/components/marketing/FeatureMockup";

type MockupKey = "chat" | "dashboard" | "grades" | "flashcard" | "assignment" | "analytics" | "admin" | "security" | "learning";

export const metadata: Metadata = {
  title: "Für Eltern | MasterMind",
  description:
    "MasterMind für Eltern: Noten und Fehlzeiten im Blick, Krankmeldung in wenigen Klicks, Elterngespräche online buchen und Lernfortschritt des Kindes verfolgen — DSGVO-konform.",
};

const sections: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; bullets: string[]; mockup: MockupKey }[] = [
  {
    icon: BarChart2,
    title: "Noten & Lernfortschritt im Blick",
    mockup: "grades",
    bullets: [
      "Alle Noten des Kindes zentral und immer aktuell einsehen",
      "Wochenbericht mit Lernaktivität, Fehlzeiten und Trend zur Vorwoche",
      "Leistungsentwicklung über die Zeit graphisch verfolgen",
    ],
  },
  {
    icon: Bell,
    title: "Krankmeldung in wenigen Klicks",
    mockup: "dashboard",
    bullets: [
      "Kind mit wenigen Klicks krankmelden — digital statt Zettel",
      "Automatische Erinnerungen an wichtige Abgaben und Termine",
      "Wichtige Schulnachrichten direkt per Benachrichtigung",
    ],
  },
  {
    icon: CalendarClock,
    title: "Elterngespräche online buchen",
    mockup: "assignment",
    bullets: [
      "Freie Sprechstunden-Slots der Lehrkräfte auf einen Blick",
      "Termin in Sekunden buchen — ohne Telefonate und Warteschleifen",
      "Belohnungs-Versprechen als Motivation für dein Kind hinterlegen",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Sicher & DSGVO-konform",
    mockup: "security",
    bullets: [
      "Server in Deutschland, keine Weitergabe an Dritte",
      "Nur Zugriff auf die Daten des eigenen Kindes",
      "Kein Tracking, kein Datenverkauf",
    ],
  },
];

export default function FuerElternPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border section">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              <span className="inline-block size-1.5 bg-brand" />
              Für Eltern
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl">
              Immer nah dran am Schulalltag
            </h1>
            <p className="mt-5 text-lg text-muted-fg">
              MasterMind hält Eltern auf dem Laufenden: Noten, Fehlzeiten und
              Termine an einem Ort — Krankmeldung und Elterngespräche mit wenigen
              Klicks, sicher und DSGVO-konform.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/kontakt"
                className={buttonVariants({ size: "lg", className: "glow-on-hover" })}
              >
                Demo buchen
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
            <h2 className="text-3xl sm:text-4xl">Ihre Schule nutzt MasterMind noch nicht?</h2>
            <p className="mt-4 text-lg text-muted-fg">
              Empfehlen Sie MasterMind Ihrer Schulleitung — oder buchen Sie eine
              unverbindliche Demo.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/kontakt"
                className={buttonVariants({ size: "lg", className: "glow-on-hover" })}
              >
                Demo buchen
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/funktionen"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Alle Funktionen ansehen
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
