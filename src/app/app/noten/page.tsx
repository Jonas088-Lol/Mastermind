/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Download,
  MoveRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ZielRechner from "./ZielRechner";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Noten" };

function currentSchoolPeriod(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year = now.getFullYear();
  // School year starts in September; Halbjahr 1 = Sep–Jan, Halbjahr 2 = Feb–Aug
  const schoolYearStart = month >= 9 ? year : year - 1;
  const halbjahr = month >= 2 && month <= 8 ? 2 : 1;
  return `Halbjahr ${halbjahr} · Schuljahr ${schoolYearStart}/${String(schoolYearStart + 1).slice(2)}`;
}

const TYPE_DE: Record<string, string> = {
  klausur: "Klassenarbeit",
  test: "Test",
  muendlich: "Mündlich",
  hausaufgabe: "Hausaufgabe",
  projekt: "Projekt",
};

function fmt(n: number) {
  return n.toFixed(1).replace(".", ",");
}

export default async function NotenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const grades = await prisma.grade.findMany({
    where: { studentId: session.userId },
    include: {
      subject: { select: { id: true, name: true, shortName: true, color: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // Group by subject
  const bySubject = new Map<
    string,
    {
      subject: (typeof grades)[number]["subject"];
      teacher: string;
      grades: (typeof grades)[number][];
    }
  >();

  for (const g of grades) {
    const key = g.subject.id;
    if (!bySubject.has(key)) {
      bySubject.set(key, { subject: g.subject, teacher: g.teacher.name, grades: [] });
    }
    bySubject.get(key)!.grades.push(g);
  }

  function weightedAvg(gs: (typeof grades)[number][]) {
    const totalWeight = gs.reduce((s, g) => s + g.weight, 0);
    if (totalWeight === 0) return 0;
    return gs.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight;
  }

  const subjects = Array.from(bySubject.values()).map((s) => {
    const avg = weightedAvg(s.grades);
    const writtenGs = s.grades.filter((g) => g.type !== "muendlich");
    const oralGs = s.grades.filter((g) => g.type === "muendlich");
    const writtenAvg = writtenGs.length ? weightedAvg(writtenGs) : null;
    const oralAvg = oralGs.length ? weightedAvg(oralGs) : null;
    // Trend: Ø der letzten 3 Noten vs. Ø der Noten davor (grades sind date-desc sortiert)
    const recent = s.grades.slice(0, 3);
    const older = s.grades.slice(3);
    let trend: "up" | "down" | "flat" | null = null;
    if (older.length > 0 && recent.length > 0) {
      const recentAvg = recent.reduce((sum, g) => sum + g.value, 0) / recent.length;
      const olderAvg = older.reduce((sum, g) => sum + g.value, 0) / older.length;
      const diff = recentAvg - olderAvg; // kleiner = besser
      trend = diff < -0.15 ? "up" : diff > 0.15 ? "down" : "flat";
    }
    return { ...s, avg, writtenAvg, oralAvg, trend };
  });

  const sorted = [...subjects].sort((a, b) => a.avg - b.avg);
  const overallAvg = subjects.length ? subjects.reduce((s, x) => s + x.avg, 0) / subjects.length : 0;
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            {currentSchoolPeriod()}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Noten-Übersicht</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Ø{" "}
            <span className="font-semibold text-fg">{fmt(overallAvg)}</span> ·{" "}
            {subjects.length} Fächer
            {best && <> · Bestes Fach: {best.subject.name}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/noten/verlauf"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <TrendingUp className="size-3.5" />
            Notenverlauf
          </Link>
          <Link
            href="/app/noten/zeugnis"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="size-3.5" />
            Zeugnis-Vorschau
          </Link>
        </div>
      </header>

      {subjects.length === 0 && (
        <p className="text-muted-fg">Noch keine Noten vorhanden.</p>
      )}

      {subjects.length > 0 && (
        <>
          <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
            <Stat label="Ø Halbjahr 2" value={fmt(overallAvg)} suffix="alle Fächer" tone="text-brand" />
            <Stat label="Bestes Fach" value={best ? fmt(best.avg) : "—"} suffix={best?.subject.name ?? "—"} tone="text-success" />
            <Stat label="Schwächstes Fach" value={worst ? fmt(worst.avg) : "—"} suffix={worst?.subject.name ?? "—"} tone="text-warning" />
            <Stat label="Gesamt Noten" value={String(grades.length)} suffix={`in ${subjects.length} Fächern`} tone="text-info" />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Fächer</CardTitle>
              <span className="font-mono text-xs text-muted-fg">
                {subjects.length} Fächer · sortiert nach Note
              </span>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              <ul className="divide-y divide-border border-t border-border">
                {sorted.map((s) => (
                  <li
                    key={s.subject.id}
                    className="grid grid-cols-1 gap-4 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[1fr_auto_auto_auto] lg:items-center lg:gap-6"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{ backgroundColor: s.subject.color }}
                        />
                        <p className="text-base font-bold tracking-tight">{s.subject.name}</p>
                        {s.trend === "up" && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-success" title="Ø der letzten 3 Noten besser als davor">
                            <TrendingUp className="size-3.5" />
                            Aufwärts
                          </span>
                        )}
                        {s.trend === "down" && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-danger" title="Ø der letzten 3 Noten schlechter als davor">
                            <TrendingDown className="size-3.5" />
                            Abwärts
                          </span>
                        )}
                        {s.trend === "flat" && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-muted-fg" title="Ø der letzten 3 Noten etwa gleich wie davor">
                            <MoveRight className="size-3.5" />
                            Stabil
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-fg">{s.teacher}</p>
                    </div>

                    <div className="hidden gap-6 sm:grid sm:grid-cols-2">
                      {s.writtenAvg !== null && (
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Schriftlich</p>
                          <p className="font-mono text-base font-bold tabular-nums">{fmt(s.writtenAvg)}</p>
                          <Progress value={Math.round(((6 - s.writtenAvg) / 5) * 100)} className="h-1" />
                        </div>
                      )}
                      {s.oralAvg !== null && (
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Mündlich</p>
                          <p className="font-mono text-base font-bold tabular-nums">{fmt(s.oralAvg)}</p>
                          <Progress value={Math.round(((6 - s.oralAvg) / 5) * 100)} className="h-1" />
                        </div>
                      )}
                    </div>

                    <p
                      className={cn(
                        "font-mono text-3xl font-bold tabular-nums sm:text-2xl",
                        s.avg >= 4 && "text-danger",
                        s.avg >= 3 && s.avg < 4 && "text-warning"
                      )}
                    >
                      {fmt(s.avg)}
                    </p>

                    <Link
                      href={`/app/noten/${s.subject.id}`}
                      className={buttonVariants({ size: "sm", variant: "ghost" })}
                    >
                      Details
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <ZielRechner
            faecher={subjects.map((s) => ({
              id: s.subject.id,
              name: s.subject.name,
              values: s.grades.map((g) => g.value),
            }))}
          />

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Letzte Bewertungen</CardTitle>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {grades.slice(0, 8).map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface"
                    >
                      <span className="font-mono text-xs text-muted-fg">
                        {g.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ backgroundColor: g.subject.color }}
                          />
                          <Badge variant="outline">{g.subject.shortName}</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{TYPE_DE[g.type] ?? g.type}</p>
                      </div>
                      <p
                        className={cn(
                          "font-mono text-lg font-bold tabular-nums",
                          g.value >= 4 && "text-danger",
                          g.value >= 3 && g.value < 4 && "text-warning"
                        )}
                      >
                        {fmt(g.value)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card className="border-brand/40 bg-gradient-to-br from-brand/8 to-transparent">
              <CardBody className="p-5!">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                    KI-Coach · Was solltest du wissen
                  </p>
                </div>
                <ul className="mt-5 space-y-4 text-sm">
                  {sorted.slice(0, 1).map((s) => (
                    <li key={s.subject.id} className="flex items-start gap-3">
                      <TrendingUp className="mt-0.5 size-4 shrink-0 text-success" />
                      <div>
                        <p className="font-semibold">{s.subject.name} · Ø {fmt(s.avg)}</p>
                        <p className="mt-0.5 text-muted-fg">
                          Dein bestes Fach — {s.grades.length} Bewertungen bisher.
                        </p>
                      </div>
                    </li>
                  ))}
                  {worst && worst.avg >= 3 && (
                    <li className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      <div>
                        <p className="font-semibold">{worst.subject.name} · Ø {fmt(worst.avg)}</p>
                        <p className="mt-0.5 text-muted-fg">
                          Hier lohnt sich mehr Übung. KI-Lernpfad verfügbar.
                        </p>
                      </div>
                    </li>
                  )}
                  {worst && worst.avg >= 4 && (
                    <li className="flex items-start gap-3">
                      <TrendingDown className="mt-0.5 size-4 shrink-0 text-danger" />
                      <div>
                        <p className="font-semibold">{worst.subject.name} · Ø {fmt(worst.avg)}</p>
                        <p className="mt-0.5 text-muted-fg">
                          Gefährliche Zone — jetzt gegensteuern.
                        </p>
                      </div>
                    </li>
                  )}
                </ul>
                <Link
                  href="/app/lernen"
                  className="mt-6 flex w-full items-center justify-center gap-1.5 bg-fg px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
                >
                  Lernplan starten
                  <ArrowRight className="size-3.5" />
                </Link>
              </CardBody>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: string; suffix: string; tone: string }) {
  return (
    <div className="bg-bg p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
        <Award className={cn("size-4", tone)} strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-fg">{suffix}</p>
    </div>
  );
}
