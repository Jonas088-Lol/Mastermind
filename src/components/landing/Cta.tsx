import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="border-b border-border section bg-fg text-bg">
      <Container className="grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-glow">
            <span className="inline-block size-1.5 bg-brand" />
            Pilotphase 2027
          </span>
          <h2 className="mt-5 text-4xl sm:text-5xl xl:text-6xl">
            Werde Pilotschule.
            <br />
            <span className="text-bg/60">Spare Jahre Setup.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg text-bg/70">
            Wir nehmen 10 Schulen für die Pilotphase. 80 % Rabatt im ersten Jahr,
            persönliches Onboarding, direkte Linie zum Produktteam.
          </p>
        </div>

        <div className="lg:col-span-5 lg:justify-self-end">
          <div className="flex flex-col gap-3">
            <Button size="lg" className="bg-brand hover:bg-brand-dark">
              Pilot anfragen
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-bg hover:bg-bg/10"
            >
              Whitepaper laden →
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
