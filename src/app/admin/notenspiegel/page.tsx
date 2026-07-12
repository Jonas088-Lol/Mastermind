/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notenspiegel" };

function gradeToPct(g: number) {
  return Math.round(Math.max(0, ((6 - g) / 5) * 100));
}

function avg(vals: number[]): number | null {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export default async function NotenspiegelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect("/");

  const schoolId = session.schoolId ?? undefined;

  const [subjects, grades, studentCount, classCount] = await Promise.all([
    prisma.subject.findMany({
      where: schoolId ? { schoolId } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true, shortName: true, color: true },
    }),
    prisma.grade.findMany({
      where: schoolId
        ? { student: { schoolId } }
        : {},
      select: {
        value: true,
        weight: true,
        subjectId: true,
        date: true,
        student: { select: { classId: true } },
      },
    }),
    prisma.user.count({ where: { role: "student", ...(schoolId ? { schoolId } : {}) } }),
    prisma.schoolClass.count({ where: schoolId ? { schoolId } : {} }),
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);

  type SubjectRow = {
    id: string;
    name: string;
    shortName: string;
    color: string;
    count: number;
    avgGrade: number | null;
    avgPct: number;
    trend: "up" | "down" | "flat";
    dist: number[];
  };

  const rows: SubjectRow[] = subjects.map((s) => {
    const sg = grades.filter((g) => g.subjectId === s.id);
    const vals = sg.map((g) => g.value);
    const recentVals = sg.filter((g) => g.date >= thirtyDaysAgo).map((g) => g.value);
    const olderVals = sg.filter((g) => g.date >= sixtyDaysAgo && g.date < thirtyDaysAgo).map((g) => g.value);

    const avgAll = avg(vals);
    const avgRecent = avg(recentVals);
    const avgOlder = avg(olderVals);

    let trend: "up" | "down" | "flat" = "flat";
    if (avgRecent !== null && avgOlder !== null) {
      if (avgRecent < avgOlder - 0.2) trend = "up";
      else if (avgRecent > avgOlder + 0.2) trend = "down";
    }

    // Grade distribution: count of grades 1–6
    const dist = [1, 2, 3, 4, 5, 6].map(
      (n) => vals.filter((v) => Math.round(v) === n).length
    );

    return {
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      color: s.color,
      count: vals.length,
      avgGrade: avgAll,
      avgPct: avgAll ? gradeToPct(avgAll) : 0,
      trend,
      dist,
    };
  });

  const overallVals = grades.map((g) => g.value);
  const overallAvg = avg(overallVals);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Admin · Schulanalyse
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Notenspiegel</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {subjects.length} Fächer · {grades.length} Noten · {studentCount} Schüler
        </p>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {[
          { label: "Fächer", value: String(subjects.length), icon: BookOpen, tone: "text-brand" },
          { label: "Schüler", value: String(studentCount), icon: Users, tone: "text-info" },
          { label: "Klassen", value: String(classCount), icon: GraduationCap, tone: "text-fg" },
          { label: "Gesamt-Ø",
            value: overallAvg ? overallAvg.toFixed(1).replace(".", ",") : "—",
            icon: BarChart3,
            tone: overallAvg && overallAvg <= 3 ? "text-success" : overallAvg && overallAvg >= 4 ? "text-danger" : "text-warning",
          },
        ].map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </section>

      {rows.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-fg">Noch keine Fächer oder Noten vorhanden.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows
            .filter((r) => r.count > 0)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((r) => {
              const TrendIcon = r.trend === "up" ? TrendingUp : r.trend === "down" ? TrendingDown : null;
              const maxDist = Math.max(...r.dist, 1);
              return (
                <Card key={r.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className="grid size-10 shrink-0 place-items-center font-mono text-sm font-bold text-white"
                        style={{ backgroundColor: r.color }}
                      >
                        {r.shortName}
                      </div>
                      <div>
                        <CardTitle>{r.name}</CardTitle>
                        <p className="mt-0.5 text-xs text-muted-fg">{r.count} Noten</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {TrendIcon && (
                        <TrendIcon
                          className={cn("size-4", r.trend === "up" ? "text-success" : "text-danger")}
                          strokeWidth={1.75}
                        />
                      )}
                      <Badge variant={r.avgPct >= 70 ? "success" : r.avgPct >= 50 ? "brand" : "warning"}>
                        {r.avgGrade ? r.avgGrade.toFixed(1).replace(".", ",") : "—"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-fg">Ø-Leistung</span>
                          <span className="font-mono font-semibold">{r.avgPct}%</span>
                        </div>
                        <Progress
                          value={r.avgPct}
                          tone={r.avgPct >= 70 ? "success" : r.avgPct >= 50 ? "brand" : "warning"}
                        />
                      </div>

                      {/* Grade distribution mini-bars */}
                      <div className="pt-1">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                          Notenverteilung
                        </p>
                        <div className="flex items-end gap-1">
                          {r.dist.map((count, i) => {
                            const grade = i + 1;
                            const heightPct = maxDist > 0 ? (count / maxDist) * 100 : 0;
                            const isWeak = grade >= 5;
                            const isMid = grade === 4;
                            return (
                              <div key={grade} className="flex flex-1 flex-col items-center gap-1">
                                <div className="w-full" style={{ height: 40 }}>
                                  <div
                                    className={cn(
                                      "w-full transition-all",
                                      isWeak ? "bg-danger/60" : isMid ? "bg-warning/60" : "bg-success/60"
                                    )}
                                    style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] text-muted-fg">{grade}</span>
                                {count > 0 && (
                                  <span className="font-mono text-[9px] font-bold">{count}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
        </div>
      )}

      {rows.filter((r) => r.count === 0).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fächer ohne Noten</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {rows
                .filter((r) => r.count === 0)
                .map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center px-2 py-1 text-xs font-semibold"
                    style={{ backgroundColor: r.color + "22", color: r.color }}
                  >
                    {r.shortName} · {r.name}
                  </span>
                ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
