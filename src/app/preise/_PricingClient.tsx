"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X, ArrowLeft, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Basic",
    description: "Für kleine Schulen, die digital starten.",
    priceMonthly: "149",
    priceAnnual: "1.490",
    suffix: "€ / Jahr",
    suffixMonthly: "€ / Monat",
    seats: "bis 100 Accounts",
    features: [
      "Lernen, Karteikarten, Aufgaben",
      "Stundenplan & Klassenbuch",
      "Eltern-Modul + Krankmeldung",
      "E-Mail-Support",
    ],
    cta: "Kostenlos testen",
    highlight: false,
  },
  {
    name: "Pro",
    description: "Der Standard für ambitionierte Schulen.",
    priceMonthly: "9",
    priceAnnual: "9",
    suffix: "€ / User · Jahr",
    suffixMonthly: "€ / User · Monat",
    seats: "unbegrenzte Accounts",
    features: [
      "Alles aus Basic",
      "KI-Tutor + Aufgaben-Generator",
      "Auto-Korrektur & Kompetenz-Heatmaps",
      "API + Reports",
      "Priority Support",
    ],
    cta: "Pilot anfragen",
    highlight: true,
  },
  {
    name: "Enterprise",
    description: "Für Schulträger und Multi-Campus.",
    priceMonthly: "—",
    priceAnnual: "Auf Anfrage",
    suffix: "",
    suffixMonthly: "",
    seats: "Multi-Tenant + White-Label",
    features: [
      "Alles aus Pro",
      "SSO (SAML/SCIM)",
      "Custom Branding & Domain",
      "Dedicated DPA & SLA",
      "Persönlicher CSM",
    ],
    cta: "Vertrieb kontaktieren",
    highlight: false,
  },
];

const comparisonRows: {
  feature: string;
  basic: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}[] = [
  { feature: "Schüler", basic: "bis 100", pro: "bis 500", enterprise: "Unbegrenzt" },
  { feature: "KI-Generator", basic: "50 Anfragen/Monat", pro: "500/Monat", enterprise: "Unbegrenzt" },
  { feature: "Gamification", basic: true, pro: true, enterprise: true },
  { feature: "Eltern-App", basic: false, pro: true, enterprise: true },
  { feature: "API-Zugang", basic: false, pro: false, enterprise: true },
  { feature: "SLA", basic: "99%", pro: "99,5%", enterprise: "99,9%" },
  { feature: "Support", basic: "E-Mail", pro: "E-Mail + Chat", enterprise: "Dedizierter Manager" },
];

const faqs = [
  {
    q: "Gibt es eine kostenlose Testphase?",
    a: "Ja. Alle Pläne können 30 Tage lang kostenlos und ohne Kreditkarte getestet werden. Nach der Testphase können Sie frei wählen, welchen Plan Sie fortführen möchten.",
  },
  {
    q: 'Was bedeutet „2 Monate gratis“ bei jährlicher Zahlung?',
    a: "Bei jährlicher Abrechnung zahlen Sie effektiv nur 10 statt 12 Monate — Sie sparen damit rund 17 % gegenüber der monatlichen Abrechnung.",
  },
  {
    q: "Kann ich meinen Plan jederzeit wechseln?",
    a: "Upgrades sind jederzeit sofort möglich. Ein Downgrade wird zum Ende der aktuellen Abrechnungsperiode wirksam.",
  },
  {
    q: "Sind die Preise inklusive Mehrwertsteuer?",
    a: "Ja, alle angegebenen Preise verstehen sich inklusive 19 % MwSt. Das Hosting erfolgt auf Servern in Deutschland (Frankfurt am Main).",
  },
  {
    q: "Was passiert nach der Kündigung mit unseren Daten?",
    a: "Nach der Kündigung erhalten Sie einen vollständigen Datenexport im CSV/JSON-Format. Anschließend werden alle personenbezogenen Daten nach DSGVO-Vorgaben gelöscht.",
  },
];

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto size-4 text-brand" strokeWidth={2.5} />;
  if (value === false) return <X className="mx-auto size-4 text-muted-fg/50" strokeWidth={2} />;
  return <span>{value}</span>;
}

export function PricingPageClient() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="border-b border-border section">
          <Container>
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
            >
              <ArrowLeft className="size-3.5" />
              Startseite
            </Link>

            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">
                <span className="inline-block size-1.5 bg-brand" />
                Preise
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl">
                Transparente Preise für jede Schulgröße
              </h1>
              <p className="mt-5 text-lg text-muted-fg">
                Pilotphase 30 Tage gratis · Jederzeit kündbar · Hosting in Deutschland
              </p>

              {/* Monthly / Annual toggle */}
              <div className="mt-8 inline-flex items-center gap-1 border border-border bg-bg p-1">
                <button
                  onClick={() => setAnnual(false)}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold transition-colors",
                    !annual ? "bg-fg text-bg" : "text-muted-fg hover:text-fg"
                  )}
                >
                  Monatlich
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors",
                    annual ? "bg-fg text-bg" : "text-muted-fg hover:text-fg"
                  )}
                >
                  Jährlich
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      annual ? "bg-brand text-brand-fg" : "bg-surface text-muted-fg"
                    )}
                  >
                    2 Monate gratis
                  </span>
                </button>
              </div>
            </div>

            {/* Plan cards */}
            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {plans.map((p) => (
                <article
                  key={p.name}
                  className={cn(
                    "relative flex flex-col border bg-bg p-8 transition-all",
                    p.highlight
                      ? "border-brand shadow-[0_24px_60px_-20px_hsl(var(--brand)/0.35)]"
                      : "border-border hover:border-border-strong"
                  )}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-8 bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-fg">
                      Empfohlen
                    </span>
                  )}

                  <div>
                    <h2 className="text-xl font-bold">{p.name}</h2>
                    <p className="mt-1.5 text-sm text-muted-fg">{p.description}</p>
                  </div>

                  <div className="mt-7 border-y border-border py-6">
                    <p className="font-mono text-4xl font-bold tracking-tight">
                      {annual ? p.priceAnnual : p.priceMonthly}
                      {(annual ? p.suffix : p.suffixMonthly) && (
                        <span className="ml-1 align-baseline text-sm font-normal text-muted-fg">
                          {annual ? p.suffix : p.suffixMonthly}
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wider text-muted-fg">
                      {p.seats}
                    </p>
                  </div>

                  <ul className="mt-6 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2.5} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/register" className="mt-8">
                    <Button
                      className="w-full"
                      variant={p.highlight ? "primary" : "outline"}
                      size="lg"
                    >
                      {p.cta}
                    </Button>
                  </Link>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-xl text-center text-xs text-muted-fg">
              Schüler-Premium separat ab 7,99 € / Monat — buchbar zusätzlich zu jedem
              Schulpaket. Preise inkl. 19 % MwSt., Hosting in Deutschland.
            </p>
          </Container>
        </section>

        {/* Feature comparison table */}
        <section className="border-b border-border section">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">Vergleich</span>
              <h2 className="mt-4 text-3xl sm:text-4xl">Was ist in jedem Plan enthalten?</h2>
            </div>

            <div className="mt-12 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 pr-6 text-left font-semibold text-muted-fg">Feature</th>
                    {plans.map((p) => (
                      <th
                        key={p.name}
                        className={cn(
                          "px-4 py-4 text-center font-bold",
                          p.highlight ? "text-brand" : "text-fg"
                        )}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={cn(
                        "border-b border-border/50 transition-colors hover:bg-surface/50",
                        i % 2 === 0 ? "bg-transparent" : "bg-surface/20"
                      )}
                    >
                      <td className="py-3.5 pr-6 font-medium">{row.feature}</td>
                      <td className="px-4 py-3.5 text-center text-muted-fg">
                        <CellValue value={row.basic} />
                      </td>
                      <td className="px-4 py-3.5 text-center text-muted-fg">
                        <CellValue value={row.pro} />
                      </td>
                      <td className="px-4 py-3.5 text-center text-muted-fg">
                        <CellValue value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section className="border-b border-border section">
          <Container>
            <div className="mx-auto max-w-2xl">
              <span className="eyebrow">FAQ</span>
              <h2 className="mt-4 text-3xl sm:text-4xl">Häufige Fragen zu den Preisen</h2>

              <div className="mt-10 space-y-4">
                {faqs.map((faq) => (
                  <details key={faq.q} className="group border border-border bg-bg">
                    <summary className="flex cursor-pointer select-none items-center justify-between gap-4 px-6 py-4 font-semibold">
                      {faq.q}
                      <span className="ml-4 shrink-0 text-muted-fg transition-transform group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <p className="border-t border-border px-6 pb-5 pt-4 text-sm leading-relaxed text-muted-fg">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="section">
          <Container>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl sm:text-4xl">Bereit loszulegen?</h2>
              <p className="mt-4 text-lg text-muted-fg">
                30 Tage kostenlos testen — keine Kreditkarte, kein Risiko.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/register">
                  <Button size="lg" className="glow-on-hover">
                    Kostenlos testen
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/kontakt">
                  <Button size="lg" variant="outline">
                    Vertrieb kontaktieren
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
