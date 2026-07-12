/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Meine Statistik" };

const SUBJECT_LABELS: Record<string, string> = {
  mathematik: "Mathematik",
  deutsch: "Deutsch",
  englisch: "Englisch",
  physik: "Physik",
  chemie: "Chemie",
  biologie: "Biologie",
  geschichte: "Geschichte",
  informatik: "Informatik",
  geografie: "Geografie",
  wirtschaft: "Wirtschaft",
  musik: "Musik",
  sport: "Sport",
};

function subjectLabel(key: string): string {
  return SUBJECT_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export default async function UebungsStatsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const answers = await prisma.exerciseAnswer.findMany({
    where: { userId: session.userId },
    select: {
      correct: true,
      createdAt: true,
      question: { select: { topic: { select: { subject: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const total = answers.length;
  const correctCount = answers.filter((a) => a.correct).length;
  const quote = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Pro Fach
  const bySubject = new Map<string, { total: number; correct: number }>();
  for (const a of answers) {
    const key = a.question.topic.subject;
    const entry = bySubject.get(key) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (a.correct) entry.correct += 1;
    bySubject.set(key, entry);
  }
  const subjectRows = [...bySubject.entries()]
    .map(([subject, s]) => ({
      subject,
      total: s.total,
      correct: s.correct,
      quote: Math.round((s.correct / s.total) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  const rated = subjectRows.filter((s) => s.total >= 3);
  const pool = rated.length > 0 ? rated : subjectRows;
  const strongest = pool.length > 0 ? [...pool].sort((a, b) => b.quote - a.quote)[0] : null;
  const weakest = pool.length > 1 ? [...pool].sort((a, b) => a.quote - b.quote)[0] : null;

  // Letzte 7 Tage Aktivität
  const days: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const count = answers.filter((a) => a.createdAt >= day && a.createdAt < next).length;
    days.push({ label: WEEKDAYS[day.getDay()], count });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <Link href="/app/uebungen" className="text-sm text-brand hover:underline">
          ← Zurück zu den Übungen
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">📊 Meine Statistik</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Dein Überblick über alle beantworteten Übungsfragen.
        </p>
      </header>

      {total === 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-4xl">🌱</p>
          <p className="mt-3 font-semibold">Noch keine Antworten</p>
          <p className="mt-1 text-sm text-muted-fg">
            Sobald du Übungsfragen beantwortest, erscheint hier deine Statistik.
          </p>
          <Link
            href="/app/uebungen"
            className="mt-4 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Jetzt üben
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Beantwortet</p>
              <p className="mt-1 text-3xl font-bold">{total}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Richtig</p>
              <p className="mt-1 text-3xl font-bold">{correctCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Quote</p>
              <p className="mt-1 text-3xl font-bold text-brand">{quote}%</p>
            </div>
          </section>

          {(strongest || weakest) && (
            <section className="grid gap-3 sm:grid-cols-2">
              {strongest && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-500/10 p-5 dark:border-emerald-800">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    💪 Stärkstes Fach
                  </p>
                  <p className="mt-1 font-bold">{subjectLabel(strongest.subject)}</p>
                  <p className="text-sm text-muted-fg">
                    {strongest.quote}% richtig ({strongest.correct}/{strongest.total})
                  </p>
                </div>
              )}
              {weakest && weakest.subject !== strongest?.subject && (
                <div className="rounded-2xl border border-amber-200 bg-amber-500/10 p-5 dark:border-amber-800">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    🎯 Übungsbedarf
                  </p>
                  <p className="mt-1 font-bold">{subjectLabel(weakest.subject)}</p>
                  <p className="text-sm text-muted-fg">
                    {weakest.quote}% richtig ({weakest.correct}/{weakest.total})
                  </p>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold">Quote pro Fach</h2>
            <div className="mt-4 flex flex-col gap-4">
              {subjectRows.map((s) => (
                <div key={s.subject}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{subjectLabel(s.subject)}</span>
                    <span className="text-muted-fg">
                      {s.quote}% · {s.correct}/{s.total}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full ${
                        s.quote >= 70 ? "bg-emerald-500" : s.quote >= 40 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${s.quote}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold">Letzte 7 Tage</h2>
            <div className="mt-4 flex items-end justify-between gap-2" style={{ height: "8rem" }}>
              {days.map((d, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs text-muted-fg">{d.count > 0 ? d.count : ""}</span>
                  <div
                    className={`w-full max-w-10 rounded-t-lg ${d.count > 0 ? "bg-brand" : "bg-border"}`}
                    style={{ height: `${Math.max(4, Math.round((d.count / maxDay) * 100))}%` }}
                  />
                  <span className="text-xs text-muted-fg">{d.label}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
