import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  School,
  ShieldCheck,
  KeyRound,
  LineChart,
  Code2,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { FeatureMockup } from "@/components/marketing/FeatureMockup";

type MockupKey = "chat" | "dashboard" | "grades" | "flashcard" | "assignment" | "analytics" | "admin" | "security" | "learning";

export const metadata: Metadata = {
  title: "Für Schulen | MasterMind",
  description:
    "MasterMind für Schulen: vollständige Schulplattform mit DSGVO-Konformität, SSO, Reporting und API — alles aus einer Hand.",
};

const sections: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; bullets: string[]; mockup: MockupKey }[] = [
  {
    icon: School,
    title: "Schul-Administration",
    mockup: "admin",
    bullets: [
      "Klassen, Fächer und Stundenpläne zentral verwalten",
      "Stundenplan-Import aus Untis in weniger als 5 Minuten",
      "Digitales Klassenbuch, Fehlzeiten und Vertretungsplan",
    ],
  },
  {
    icon: ShieldCheck,
    title: "DSGVO-Konformität",
    mockup: "security",
    bullets: [
      "Hosting ausschließlich auf ISO-27001-zertifizierten Servern in Frankfurt",
      "AVV-Abschluss innerhalb von 24 Stunden nach Vertragsschluss",
      "Kein Tracking, keine Werbung, kein Datenverkauf — garantiert",
    ],
  },
  {
    icon: KeyRound,
    title: "SSO & Anmeldung",
    mockup: "admin",
    bullets: [
      "SAML 2.0 und SCIM für Microsoft Azure AD, Google Workspace und mehr",
      "Zwei-Faktor-Authentifizierung für alle Benutzerkonten",
      "Einladungslinks und Massen-Import per CSV für schnelles Onboarding",
    ],
  },
  {
    icon: LineChart,
    title: "Reporting & Analytics",
    mockup: "analytics",
    bullets: [
      "Schulweite Lernstands-Übersicht für die Schulleitung",
      "Fach- und Klassenvergleiche als Export oder Live-Dashboard",
      "Audit-Log aller relevanten Aktionen für Transparenz und Compliance",
    ],
  },
  {
    icon: Code2,
    title: "API & Integrationen",
    mockup: "dashboard",
    bullets: [
      "REST-API für eigene Anpassungen und Drittsysteme",
      "Webhooks für Echtzeit-Benachrichtigungen an Schulverwaltungs-Software",
      "White-Label-Option für Schulträger mit eigenem Branding und Domain",
    ],
  },
];

export default function FuerSchulenPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border section">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              <span className="inline-block size-1.5 bg-brand" />
              Für Schulen
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl">
              Die komplette Schulplattform
            </h1>
            <p className="mt-5 text-lg text-muted-fg">
              Von der Administration über DSGVO-konforme Kommunikation bis hin zur
              KI-gestützten Lernanalyse — MasterMind ist die einzige Plattform, die
              Ihre Schule wirklich braucht.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/kontakt">
                <Button size="lg" className="glow-on-hover">
                  Pilot anfragen
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/preise">
                <Button size="lg" variant="outline">
                  Preise für Schulen
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
                  <FeatureMockup variant={s.mockup} />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Trust signals */}
      <section className="border-b border-border section">
        <Container>
          <div className="grid gap-6 border border-border sm:grid-cols-3">
            {[
              { label: "Hosting", value: "Frankfurt am Main", sub: "ISO 27001 · DSGVO" },
              { label: "Uptime SLA", value: "99,9 %", sub: "Enterprise-Tier" },
              { label: "AVV", value: "24 h", sub: "Nach Vertragsschluss" },
            ].map((t) => (
              <div key={t.label} className="flex flex-col items-center border-border p-8 text-center [&:not(:last-child)]:border-r">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
                  {t.label}
                </p>
                <p className="mt-2 font-mono text-3xl font-bold">{t.value}</p>
                <p className="mt-1 text-xs text-muted-fg">{t.sub}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="section">
        <Container>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl sm:text-4xl">Jetzt Pilot starten</h2>
            <p className="mt-4 text-lg text-muted-fg">
              30 Tage kostenlos, keine Kreditkarte, persönlicher Ansprechpartner für
              den Einführungsprozess.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/kontakt">
                <Button size="lg" className="glow-on-hover">
                  Vertrieb kontaktieren
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/preise">
                <Button size="lg" variant="outline">
                  Preise vergleichen
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
