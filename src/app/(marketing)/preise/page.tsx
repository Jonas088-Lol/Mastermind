/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Pricing } from "@/components/landing/Pricing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Preise | MasterMind",
  description:
    "Transparente Preise für jede Schulgröße — Basic, Pro und Enterprise. 30 Tage kostenlos testen.",
};

const PLAN_NAMES = [
  { name: "Basic", highlight: false },
  { name: "Pro", highlight: true },
  { name: "Enterprise", highlight: false },
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

export default function PreisePage() {
  return (
    <>
      {/* Preisliste — identisch mit der Startseite */}
      <div className="border-b border-border">
        <Container>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            Startseite
          </Link>
        </Container>
        <Pricing />
      </div>

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
                  {PLAN_NAMES.map((p) => (
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
                <details key={faq.q} className="group rounded-2xl border border-border bg-bg">
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
                <Button size="lg" className="pastel-cta">
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
    </>
  );
}
