import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimateOnScroll } from "./AnimateOnScroll";

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
    seats: "Unbegrenzte Accounts",
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
      "SSO (SAML / SCIM)",
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
    <section id="preise" className="section bg-surface/50">
      <div className="container-px mx-auto max-w-7xl">
        <AnimateOnScroll animation="fade-up" className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Preise</span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl">
            Faire Preise.
            <br className="hidden sm:block" />
            Keine Überraschungen.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-fg sm:text-lg">
            Pilotphase 30 Tage gratis · Jährliche Abrechnung · Jederzeit kündbar.
          </p>
        </AnimateOnScroll>

        <div className="mt-12 grid gap-5 sm:mt-16 lg:grid-cols-3">
          {plans.map((p, i) => (
            <AnimateOnScroll
              key={p.name}
              animation={p.highlight ? "scale-up" : "fade-up"}
              delay={i * 100}
              className="flex flex-col"
            >
            <article
              className={cn(
                "relative flex flex-col flex-1 rounded-2xl border p-7 transition-[box-shadow,border-color] duration-200",
                p.highlight
                  ? "border-brand bg-bg shadow-lg ring-1 ring-brand/20"
                  : "border-border bg-bg shadow-sm hover:shadow-md hover:border-border-strong"
              )}
              style={p.highlight ? { boxShadow: "var(--shadow-brand)" } : { boxShadow: "var(--shadow-sm)" }}
            >
              {p.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Empfohlen
                </span>
              )}

              <div>
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1.5 text-sm text-muted-fg">{p.description}</p>
              </div>

              <div className="mt-6 border-t border-border pt-6">
                <p className="font-mono text-4xl font-bold tracking-tight">
                  {p.price}
                  {p.suffix && (
                    <span className="ml-1.5 align-baseline text-sm font-normal text-muted-fg">
                      {p.suffix}
                    </span>
                  )}
                </p>
                <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-muted-fg">
                  {p.seats}
                </p>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                      <Check className="size-3" strokeWidth={2.5} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-7 w-full"
                variant={p.highlight ? "primary" : "secondary"}
                size="lg"
              >
                {p.cta}
              </Button>
            </article>
            </AnimateOnScroll>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted-fg">
          Schüler-Premium separat ab 7,99 € / Monat — buchbar zusätzlich zu jedem
          Schulpaket. Preise inkl. 19 % MwSt., Hosting in Deutschland.
        </p>
      </div>
    </section>
  );
}
