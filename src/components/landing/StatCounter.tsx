"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";

/* ─── Formatting (mirrors Trust.tsx rounding rules) ─────────── */

function fmtDE(n: number): string {
  return n.toLocaleString("de-DE");
}

function formatMio(n: number): string {
  return `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 2 })}+ Mio.`;
}

function formatSchueler(n: number): string {
  if (n < 10)        return String(n);
  if (n < 1_000)     return `${Math.floor(n / 10) * 10}+`;
  if (n < 10_000)    return `${fmtDE(Math.floor(n / 100) * 100)}+`;
  if (n < 100_000)   return `${fmtDE(Math.floor(n / 1_000) * 1_000)}+`;
  if (n < 1_000_000) return `${fmtDE(Math.floor(n / 10_000) * 10_000)}+`;
  return formatMio(n);
}

function formatLehrer(n: number): string {
  if (n <= 100)      return String(n);
  if (n < 1_000)     return `${Math.floor(n / 10) * 10}+`;
  if (n < 10_000)    return `${fmtDE(Math.floor(n / 100) * 100)}+`;
  if (n < 100_000)   return `${fmtDE(Math.floor(n / 1_000) * 1_000)}+`;
  if (n < 1_000_000) return `${fmtDE(Math.floor(n / 10_000) * 10_000)}+`;
  return formatMio(n);
}

function formatSchulen(n: number): string {
  if (n < 1_000)     return String(n);
  if (n < 10_000)    return `${fmtDE(Math.floor(n / 10) * 10)}+`;
  if (n < 100_000)   return `${fmtDE(Math.floor(n / 100) * 100)}+`;
  if (n < 1_000_000) return `${fmtDE(Math.floor(n / 1_000) * 1_000)}+`;
  return formatMio(n);
}

export type StatCategory = "schueler" | "lehrer" | "schulen";

function formatValue(n: number, cat: StatCategory): string {
  const i = Math.round(n);
  switch (cat) {
    case "schueler": return formatSchueler(i);
    case "lehrer":   return formatLehrer(i);
    case "schulen":  return formatSchulen(i);
  }
}

/* ─── Gradient style ─────────────────────────────────────────── */

const gradientStyle: CSSProperties = {
  background: "linear-gradient(to right, #93C5FD, #6EE7B7)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

/* ─── Component ──────────────────────────────────────────────── */

interface Props {
  count: number;
  label: string;
  category: StatCategory;
  delay?: number;
}

export function StatCounter({ count, label, category, delay = 0 }: Props) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const rafRef = useRef<number | null>(null);

  const animate = useCallback(() => {
    const DURATION = 1800;
    const startAt = performance.now() + delay;

    function step(now: number) {
      if (now < startAt) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const elapsed = now - startAt;
      const t = Math.min(elapsed / DURATION, 1);
      // ease-out expo: fast start, gentle landing
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(formatValue(eased * count, category));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(formatValue(count, category));
      }
    }

    rafRef.current = requestAnimationFrame(step);
  }, [count, category, delay]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animate();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <span className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl" style={gradientStyle}>
        {display}
      </span>
      <span className="text-sm text-muted-fg">{label}</span>
    </div>
  );
}
