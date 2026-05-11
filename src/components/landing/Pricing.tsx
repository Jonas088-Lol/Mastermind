import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Basic",
    description: "Für kleine Schulen, die digital starten.",
    price: "1.490",
    suffix: "€ / Jahr",
    seats: "bis 100 Accounts",
    features: [
      "Lernen, Karteikarten, Aufgaben",
      "Stundenplan & Klassenbuch",
      "Eltern-Modul + Krankmeldung",
      "E-Mail-Support",
    ],
    cta: "Starten",
    highlight: false,
  },
  {
    name: "Pro",
    description: "Der Standard für ambitionierte Schulen.",
    price: "9",
    suffix: "€ / User · Jahr",
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
    price: "Auf Anfrage",
    suffix: "",
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

export function Pricing() {
  return (
    <section id="preise" className="border-b border-border section">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Preise</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">Faire Preise. Keine Überraschungen.</h2>
          <p className="mt-5 text-lg text-muted-fg">
            Pilotphase 30 Tage gratis · Jährliche Abrechnung · Jederzeit kündbar.
          </p>
        </div>

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
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1.5 text-sm text-muted-fg">{p.description}</p>
              </div>

              <div className="mt-7 border-y border-border py-6">
                <p className="font-mono text-4xl font-bold tracking-tight">
                  {p.price}
                  {p.suffix && (
                    <span className="ml-1 align-baseline text-sm font-normal text-muted-fg">
                      {p.suffix}
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

              <Button
                className="mt-8"
                variant={p.highlight ? "primary" : "outline"}
                size="lg"
              >
                {p.cta}
              </Button>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-xs text-muted-fg">
          Schüler-Premium separat ab 7,99 € / Monat — buchbar zusätzlich zu jedem
          Schulpaket. Preise inkl. 19 % MwSt., Hosting in Deutschland.
        </p>
      </Container>
    </section>
  );
}
