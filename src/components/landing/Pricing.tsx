/* Copyright 2026 Elian Schock, Jonas Schwenk */
import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimateOnScroll } from "./AnimateOnScroll";

const plans = [
  {
    name: "Pro",
    description: "Alle Funktionen für einen vollständig digitalen Schulalltag.",
    price: "1.500",
    suffix: "€ / Jahr",
    seats: "Bis zu 500 Schüler gratis",
    features: [
      "Lernen, Karteikarten, Aufgaben",
      "Stundenplan & Klassenbuch",
      "Eltern-Modul + Krankmeldung",
      "KI-Tutor + Aufgaben-Generator",
      "Auto-Korrektur & Kompetenz-Heatmaps",
      "API + Reports",
      "Priority Support",
    ],
    cta: "Pilot anfragen",
    href: "/kontakt",
    highlight: true,
  },
  {
    name: "Individual",
    description: "Wählen Sie genau die Funktionen, die Ihre Schule benötigt.",
    price: "ab 850",
    suffix: "€ / Jahr",
    seats: "Bis zu 500 Schüler gratis",
    features: [
      "Alles aus Pro",
      "SSO (SAML / SCIM)",
      "Custom Branding & Domain",
      "Dedicated DPA & SLA",
      "Persönlicher CSM",
    ],
    cta: "Konfigurieren",
    href: "/kontakt",
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
        </AnimateOnScroll>

        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:mt-16 sm:grid-cols-2">
          {plans.map((p, i) => (
            <AnimateOnScroll
              key={p.name}
              animation={p.highlight ? "scale-up" : "fade-up"}
              delay={i * 100}
              className="flex flex-col"
            >
            <article
              className={cn(
                "relative flex flex-col flex-1 rounded-2xl p-7 transition-[box-shadow,border-color] duration-200",
                p.highlight
                  ? "pastel-frame bg-bg shadow-lg"
                  : "border border-border bg-bg shadow-sm hover:shadow-md hover:border-border-strong"
              )}
              style={p.highlight ? { boxShadow: "0 8px 30px rgba(140, 210, 225, 0.25)" } : { boxShadow: "var(--shadow-sm)" }}
            >
              {p.highlight && (
                <span className="pastel-badge absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                  Empfohlen
                </span>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1.5 text-sm text-muted-fg">{p.description}</p>
              </div>

              <div className="mt-6 border-t border-border pt-6 text-center">
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

              <Link
                href={p.href}
                className={cn(
                  buttonVariants({
                    variant: p.highlight ? "primary" : "secondary",
                    size: "lg",
                  }),
                  "mt-7 w-full",
                  p.highlight && "pastel-cta"
                )}
              >
                {p.cta}
              </Link>
            </article>
            </AnimateOnScroll>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted-fg">
          Monatliche Abrechnung. Alle Preise verstehen sich inklusive der
          gesetzlichen Mehrwertsteuer. Die ersten 500 Schülerinnen und Schüler sind
          im jeweiligen Tarif enthalten, jede weitere Person wird mit 0,20 € pro
          Monat berechnet.
        </p>
      </div>
    </section>
  );
}
