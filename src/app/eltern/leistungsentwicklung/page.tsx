import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leistungsentwicklung · Eltern" };

function gradeColor(v: number) {
  if (v >= 4.5) return "text-danger";
  if (v >= 3.5) return "text-warning";
  return "text-success";
}

function gradeBadgeVariant(v: number): "success" | "warning" | "danger" | "neutral" {
  if (v >= 4.5) return "danger";
  if (v >= 3.5) return "warning";
  if (v <= 2.0) return "success";
  return "neutral";
}

export default async function LeistungsentwicklungPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const { child: childFilter } = await searchParams;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const prev30Start = sixtyDaysAgo;
  const prev30End = thirtyDaysAgo;

  const links = await prisma.parentStudentLink.findMany({
    where: {
      parentId: session.userId,
      ...(childFilter ? { studentId: childFilter } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          xp: true,
          streak: true,
          classId: true,
          schoolClass: { select: { name: true } },
          studentGrades: {
            include: { subject: { select: { id: true, name: true, color: true } } },
            orderBy: { date: "desc" },
          },
          xpLogs: {
            where: { createdAt: { gte: sixtyDaysAgo } },
            select: { amount: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  // Fetch all children links (unfiltered) for the filter nav
  const allLinks = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: { student: { select: { id: true, name: true } } },
    orderBy: { student: { name: "asc" } },
  });

  // Fetch assignment submissions for each student
  const studentIds = links.map((l) => l.student.id);
  const classIds = links.map((l) => l.student.classId).filter(Boolean) as string[];

  const assignments = classIds.length > 0
    ? await prisma.assignment.findMany({
        where: {
          classId: { in: classIds },
          dueAt: { gte: sixtyDaysAgo, lte: now },
        },
        include: {
          submissions: {
            where: { studentId: { in: studentIds } },
            select: { studentId: true, status: true },
          },
        },
      })
    : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schule</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Leistungsentwicklung</h1>
        <p className="mt-1 text-sm text-muted-fg">Notentrend, XP-Fortschritt und Aufgabenstatus deiner Kinder.</p>
      </header>

      {/* Child filter */}
      {allLinks.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <a
            href="/eltern/leistungsentwicklung"
            className={cn(
              "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
              !childFilter
                ? "bg-fg text-bg"
                : "bg-surface-2 text-muted-fg hover:text-fg"
            )}
          >
            Alle
          </a>
          {allLinks.map(({ student }) => (
            <a
              key={student.id}
              href={`/eltern/leistungsentwicklung?child=${student.id}`}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                childFilter === student.id
                  ? "bg-fg text-bg"
                  : "bg-surface-2 text-muted-fg hover:text-fg"
              )}
            >
              {student.name}
            </a>
          ))}
        </div>
      )}

      {links.length === 0 && (
        <p className="text-sm text-muted-fg">Kein Kind mit deinem Konto verknüpft.</p>
      )}

      {links.map(({ student }) => {
        const grades = student.studentGrades;
        const recent10 = grades.slice(0, 10);

        // Subject averages
        type SubjectGroup = { id: string; name: string; color: string; avg: number; count: number };
        const subjectMap = new Map<string, SubjectGroup & { weightSum: number; valueWeightSum: number }>();
        for (const g of grades) {
          if (!subjectMap.has(g.subjectId)) {
            subjectMap.set(g.subjectId, {
              id: g.subjectId,
              name: g.subject.name,
              color: g.subject.color,
              avg: 0,
              count: 0,
              weightSum: 0,
              valueWeightSum: 0,
            });
          }
          const sg = subjectMap.get(g.subjectId)!;
          sg.weightSum += g.weight;
          sg.valueWeightSum += g.value * g.weight;
          sg.count += 1;
        }
        const subjects: SubjectGroup[] = Array.from(subjectMap.values()).map((sg) => ({
          id: sg.id,
          name: sg.name,
          color: sg.color,
          avg: sg.weightSum > 0 ? sg.valueWeightSum / sg.weightSum : 0,
          count: sg.count,
        })).sort((a, b) => a.avg - b.avg);

        // Grade trend: compare first 5 vs last 5 of recent 10
        const trendGrades = recent10.slice().reverse(); // oldest first
        const firstHalf = trendGrades.slice(0, Math.ceil(trendGrades.length / 2));
        const secondHalf = trendGrades.slice(Math.ceil(trendGrades.length / 2));
        const firstAvg = firstHalf.length > 0
          ? firstHalf.reduce((s, g) => s + g.value, 0) / firstHalf.length
          : null;
        const secondAvg = secondHalf.length > 0
          ? secondHalf.reduce((s, g) => s + g.value, 0) / secondHalf.length
          : null;
        const trendDiff = firstAvg !== null && secondAvg !== null ? secondAvg - firstAvg : null;
        // Lower is better (1=best, 6=worst), so negative diff = improvement
        const TrendIcon = trendDiff === null
          ? Minus
          : trendDiff < -0.2 ? TrendingUp   // grade improving (lower value)
          : trendDiff > 0.2  ? TrendingDown  // grade worsening (higher value)
          : Minus;
        const trendClass = trendDiff === null
          ? "text-muted-fg"
          : trendDiff < -0.2 ? "text-success"
          : trendDiff > 0.2  ? "text-danger"
          : "text-muted-fg";

        // XP comparison
        const xpLast30 = student.xpLogs
          .filter((l) => l.createdAt >= thirtyDaysAgo)
          .reduce((s, l) => s + l.amount, 0);
        const xpPrev30 = student.xpLogs
          .filter((l) => l.createdAt >= prev30Start && l.createdAt < prev30End)
          .reduce((s, l) => s + l.amount, 0);
        const xpChange = xpPrev30 > 0
          ? Math.round(((xpLast30 - xpPrev30) / xpPrev30) * 100)
          : null;

        // Submission rate
        const studentAssignments = assignments.filter((a) => a.classId === student.classId);
        const totalAssignments = studentAssignments.length;
        const submittedCount = studentAssignments.filter((a) =>
          a.submissions.some(
            (s) => s.studentId === student.id && (s.status === "submitted" || s.status === "graded")
          )
        ).length;
        const submissionRate = totalAssignments > 0
          ? Math.round((submittedCount / totalAssignments) * 100)
          : null;

        // Overall average
        const totalWeight = grades.reduce((s, g) => s + g.weight, 0);
        const overallAvg = totalWeight > 0
          ? grades.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight
          : null;

        return (
          <section key={student.id} className="flex flex-col gap-6">
            {allLinks.length > 1 && (
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold">{student.name}</h2>
                {student.schoolClass && (
                  <span className="text-sm text-muted-fg">Klasse {student.schoolClass.name}</span>
                )}
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ø Note</p>
                <p className={cn("mt-2 font-mono text-3xl font-bold tabular-nums", overallAvg ? gradeColor(overallAvg) : "")}>
                  {overallAvg ? overallAvg.toFixed(1).replace(".", ",") : "—"}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendIcon className={cn("size-3.5", trendClass)} strokeWidth={2} />
                  <span className={cn("text-xs font-medium", trendClass)}>
                    {trendDiff === null ? "Keine Daten" : Math.abs(trendDiff) < 0.2 ? "Stabil" : trendDiff < 0 ? "Verbessert" : "Schlechter"}
                  </span>
                </div>
              </div>
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">XP (30 Tage)</p>
                <p className="mt-2 font-mono text-3xl font-bold">{xpLast30.toLocaleString("de-DE")}</p>
                {xpChange !== null && (
                  <p className={cn("mt-1 text-xs font-medium", xpChange >= 0 ? "text-success" : "text-danger")}>
                    {xpChange >= 0 ? "+" : ""}{xpChange}% vs. Vormonat
                  </p>
                )}
              </div>
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Abgabequote</p>
                <p className="mt-2 font-mono text-3xl font-bold">
                  {submissionRate !== null ? `${submissionRate}%` : "—"}
                </p>
                {submissionRate !== null && (
                  <p className="mt-1 text-xs text-muted-fg">{submittedCount}/{totalAssignments} Aufgaben</p>
                )}
              </div>
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Streak</p>
                <p className="mt-2 font-mono text-3xl font-bold">{student.streak}</p>
                <p className="mt-1 text-xs text-muted-fg">Tage in Folge</p>
              </div>
            </div>

            {/* Subject averages table */}
            {subjects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Fachübersicht</CardTitle>
                  <span className="text-xs text-muted-fg">{subjects.length} Fächer</span>
                </CardHeader>
                <CardBody className="!px-0 !pb-0">
                  <ul className="divide-y divide-border border-t border-border">
                    {subjects.map((sg) => (
                      <li key={sg.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: sg.color }} />
                        <span className="min-w-0 flex-1 font-medium">{sg.name}</span>
                        <span className="text-xs text-muted-fg">{sg.count} Noten</span>
                        <div className="w-24">
                          <Progress
                            value={Math.max(0, 6 - sg.avg)}
                            max={5}
                            tone={sg.avg <= 2 ? "success" : sg.avg <= 3.5 ? "brand" : sg.avg <= 4.5 ? "warning" : "danger"}
                          />
                        </div>
                        <Badge variant={gradeBadgeVariant(sg.avg)}>
                          Ø {sg.avg.toFixed(1).replace(".", ",")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {/* Recent grades */}
            {recent10.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Letzte 10 Noten</CardTitle>
                </CardHeader>
                <CardBody className="!px-0 !pb-0">
                  <ul className="divide-y divide-border border-t border-border">
                    {recent10.map((g) => (
                      <li key={g.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: g.subject.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{g.subject.name}</p>
                          <p className="text-xs text-muted-fg">
                            {g.date.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                            {g.comment && ` · ${g.comment}`}
                          </p>
                        </div>
                        <Badge variant={gradeBadgeVariant(g.value)}>
                          {g.value.toFixed(1).replace(".", ",")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {grades.length === 0 && (
              <p className="text-sm text-muted-fg">Noch keine Noten eingetragen.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
