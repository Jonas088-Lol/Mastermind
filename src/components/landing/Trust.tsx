import { prisma } from "@/lib/db/client";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "./AnimateOnScroll";
import { StatCounter } from "./StatCounter";

const partners = [
  "Realschule München",
  "Gymnasium Köln-Mitte",
  "GSG Hamburg",
  "Mittelschule Stuttgart",
  "IGS Hannover",
  "Bildungswerk NRW",
];

export async function Trust() {
  let schuelerCount = 0, lehrerCount = 0, schulenCount = 0;

  try {
    [schuelerCount, lehrerCount, schulenCount] = await Promise.all([
      prisma.user.count({ where: { role: "student" } }),
      prisma.user.count({ where: { role: "teacher" } }),
      prisma.school.count(),
    ]);
  } catch {
    // DB unavailable during static build — falls back to zeros at runtime
  }

  const stats: { count: number; label: string; category: "schueler" | "lehrer" | "schulen" }[] = [
    { count: schuelerCount, label: "Schüler",  category: "schueler" },
    { count: lehrerCount,   label: "Lehrer",   category: "lehrer"   },
    { count: schulenCount,  label: "Schulen",  category: "schulen"  },
  ];

  return (
    <section className="border-y border-border bg-bg py-16">
      <Container>
        <AnimateOnScroll animation="fade-in">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-fg">
            Unsere Pilotpartner
          </p>

          {/* School pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {partners.map((p) => (
              <span
                key={p}
                className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-muted-fg"
              >
                {p}
              </span>
            ))}
          </div>

          {/* Stat counters — animated count-up, gradient numbers */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-12 sm:gap-20">
            {stats.map((s, i) => (
              <StatCounter
                key={s.label}
                count={s.count}
                label={s.label}
                category={s.category}
                delay={i * 120}
              />
            ))}
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
