import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { AnimateOnScroll } from "./AnimateOnScroll";

const trustBadges = [
  "30 Tage gratis",
  "Persönliches Onboarding",
  "DSGVO-konform",
];

export function Cta() {
  return (
    <section className="border-b border-border bg-surface">
      <Container className="section flex flex-col items-center text-center">
        <AnimateOnScroll animation="fade-up">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl xl:text-6xl">
            Bereit für die Schule
            <br />
            von morgen?
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={80} className="mt-5">
          <p className="max-w-md text-base leading-relaxed text-muted-fg sm:text-lg">
            Starte die 30-Tage-Pilotphase. Kein Risiko, keine Kreditkarte.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={160} className="mt-10">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="pastel-cta w-full sm:w-auto"
            >
              Pilot anfragen
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              Whitepaper laden →
            </Button>
          </div>
        </AnimateOnScroll>

        {/* Trust micro-badges */}
        <AnimateOnScroll animation="fade-up" delay={240} className="mt-8">
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-fg">
            {trustBadges.map((badge) => (
              <span key={badge} className="flex items-center gap-1.5 rounded-full">
                <span className="text-brand">✓</span>
                {badge}
              </span>
            ))}
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
