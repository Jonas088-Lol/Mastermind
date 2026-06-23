import { prisma } from "@/lib/db/client";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "./AnimateOnScroll";
import type { CSSProperties } from "react";

const partners = [
  "Realschule München",
  "Gymnasium Köln-Mitte",
  "GSG Hamburg",
  "Mittelschule Stuttgart",
  "IGS Hannover",
  "Bildungswerk NRW",
];

function fmtDE(n: number): string {
  return n.toLocaleString("de-DE");
}

function formatMio(n: number): string {
  return `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 2 })}+ Mio.`;
}

function formatSchueler(n: number): string {
  if (n < 10)          return String(n);
  if (n < 1_000)       return `${Math.floor(n / 10) * 10}+`;
  if (n < 10_000)      return `${fmtDE(Math.floor(n / 100) * 100)}+`;
  if (n < 100_000)     return `${fmtDE(Math.floor(n / 1_000) * 1_000)}+`;
  if (n < 1_000_000)   return `${fmtDE(Math.floor(n / 10_000) * 10_000)}+`;
  return formatMio(n);
}

function formatLehrer(n: number): string {
  if (n <= 100)        return String(n);
  if (n < 1_000)       return `${Math.floor(n / 10) * 10}+`;
  if (n < 10_000)      return `${fmtDE(Math.floor(n / 100) * 100)}+`;
  if (n < 100_000)     return `${fmtDE(Math.floor(n / 1_000) * 1_000)}+`;
  if (n < 1_000_000)   return `${fmtDE(Math.floor(n / 10_000) * 10_000)}+`;
  return formatMio(n);
}

function formatSchulen(n: number): string {
  if (n < 1_000)       return String(n);
  if (n < 10_000)      return `${fmtDE(Math.floor(n / 10) * 10)}+`;
  if (n < 100_000)     return `${fmtDE(Math.floor(n / 100) * 100)}+`;
  if (n < 1_000_000)   return `${fmtDE(Math.floor(n / 1_000) * 1_000)}+`;
  return formatMio(n);
}

const gradientStyle: CSSProperties = {
  background: "linear-gradient(to right, #93C5FD, #6EE7B7)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export async function Trust() {
  const [schuelerCount, lehrerCount, schulenCount] = await Promise.all([
    prisma.user.count({ where: { role: "student" } }),
    prisma.user.count({ where: { role: "teacher" } }),
    prisma.school.count(),
  ]);

  const stats = [
    { value: formatSchueler(schuelerCount), label: "Schüler"  },
    { value: formatLehrer(lehrerCount),     label: "Lehrer"   },
    { value: formatSchulen(schulenCount),   label: "Schulen"  },
  ];

  return (
    <section className="border-y border-border bg-bg py-16">
      <Container>
        <AnimateOnScroll animation="fade-in">
          {/* 1.2.1 — updated heading */}
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

          {/* Stat counters — 1.2.2 dynamic + 1.2.3 gradient */}
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
                  style={gradientStyle}
                >
                  {s.value}
                </span>
                <span className="text-sm text-muted-fg">{s.label}</span>
              </AnimateOnScroll>
            ))}
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
