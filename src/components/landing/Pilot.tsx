import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { AnimateOnScroll } from "./AnimateOnScroll";

const steps = [
  {
    step: "01",
    title: "Kostenlos registrieren",
    body: "Schule anlegen, Stundenplan hochladen, Nutzer einladen — in unter einer Stunde einsatzbereit.",
  },
  {
    step: "02",
    title: "Gemeinsam einrichten",
    body: "Unser Team begleitet Lehrer, Schüler und Eltern beim Onboarding. Kein Video-Tutorial, echte Menschen.",
  },
  {
    step: "03",
    title: "30 Tage echten Betrieb testen",
    body: "Voller Funktionsumfang, echte Daten, echter Unterricht. Kein abgespeckter Demo-Modus.",
  },
  {
    step: "04",
    title: "Entscheiden — ohne Druck",
    body: "Nach 30 Tagen entscheidest du. Daten bleiben erhalten, kein automatischer Übergang in ein Abo.",
  },
];

export function Pilot() {
  return (
    <section id="pilotphase" className="section border-b border-gray-100 bg-white">
      <Container>
        <div className="flex flex-col gap-14 lg:flex-row lg:items-start lg:gap-20">
          {/* Sticky left panel */}
          <div className="lg:sticky lg:top-24 lg:max-w-sm">
            <AnimateOnScroll animation="fade-up">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                style={{ color: "hsl(172,72%,40%)" }}
              >
                Pilotphase
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                30 Tage.
                <br />
                Kein Risiko.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-gray-500">
                Teste MasterMind mit deiner echten Schule — bevor du irgendetwas
                unterschreibst. Mit persönlicher Begleitung von Tag&nbsp;1.
              </p>
              <Link
                href="/onboarding"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "mt-8 w-full sm:w-auto bg-[hsl(172,72%,40%)] text-white hover:bg-[hsl(172,72%,35%)]",
                })}
              >
                Pilotphase starten
                <ArrowRight className="size-4" />
              </Link>
              <ul className="mt-7 space-y-3">
                {[
                  "Alle Features sofort freigeschaltet",
                  "Persönlicher Ansprechpartner",
                  "Kein automatischer Übergang ins Abo",
                  "Keine Kreditkarte erforderlich",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle2
                      className="size-4 shrink-0"
                      style={{ color: "hsl(172,72%,40%)" }}
                      strokeWidth={2.5}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </AnimateOnScroll>
          </div>

          {/* Steps */}
          <ol className="flex-1">
            {steps.map((s, i) => (
              <AnimateOnScroll
                key={s.step}
                animation="fade-up"
                delay={i * 80}
              >
                <li className="flex gap-6 pb-10 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div
                      className="grid size-10 shrink-0 place-items-center rounded-full border-2 font-mono text-sm font-bold"
                      style={{
                        borderColor: "hsl(172,72%,40%)",
                        color: "hsl(172,72%,40%)",
                      }}
                    >
                      {s.step}
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className="mt-3 w-px flex-1"
                        style={{ background: "hsl(172,72%,40%,0.2)" }}
                      />
                    )}
                  </div>
                  <div className="pb-2 pt-1.5">
                    <h3 className="text-xl font-bold text-gray-900">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                      {s.body}
                    </p>
                  </div>
                </li>
              </AnimateOnScroll>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
