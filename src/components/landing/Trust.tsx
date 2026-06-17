import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "./AnimateOnScroll";

const partners = [
  "Realschule München",
  "Gymnasium Köln-Mitte",
  "GSG Hamburg",
  "Mittelschule Stuttgart",
  "IGS Hannover",
  "Bildungswerk NRW",
];

const stats = [
  { value: "12.000+", label: "Schüler" },
  { value: "240+", label: "Lehrer" },
  { value: "18", label: "Schulen" },
];

export function Trust() {
  return (
    <section className="border-y border-gray-100 bg-white py-16">
      <Container>
        <AnimateOnScroll animation="fade-in">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Vertraut von führenden Schulen in Deutschland
          </p>

          {/* School pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {partners.map((p) => (
              <span
                key={p}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-400"
              >
                {p}
              </span>
            ))}
          </div>

          {/* Stat counters */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-12 sm:gap-20">
            {stats.map((s, i) => (
              <AnimateOnScroll
                key={s.label}
                animation="fade-up"
                delay={i * 80}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className="text-4xl font-bold tracking-tight sm:text-5xl"
                  style={{ color: "hsl(172,72%,40%)" }}
                >
                  {s.value}
                </span>
                <span className="text-sm text-gray-400">{s.label}</span>
              </AnimateOnScroll>
            ))}
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
