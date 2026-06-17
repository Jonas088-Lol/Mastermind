import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Statistiken · Lehrer" };

function avg(vals: number[]): number | null {
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function gradeColor(val: number): string {
  if (val <= 2) return "text-success";
  if (val <= 4) return "text-warning";
  return "text-danger";
}

function gradeBarTone(grade: number): string {
  if (grade <= 2) return "bg-success";
  if (grade <= 4) return "bg-warning";
  return "bg-danger";
}

export default async function StatistikenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  // Classes the teacher teaches (deduplicated)
  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      class: {
        include: {
          students: { select: { id: true, name: true, xp: true } },
        },
      },
    },
    orderBy: { class: { name: "asc" } },
  });

  // Deduplicate by classId for top-level stats but keep by classId+subjectId for grade data
  const uniqueClassIds = [...new Set(tscEntries.map((t) => t.classId))];

  // Fetch all relevant data in parallel
  const [allGrades, allAssignments, allAttendance] = await Promise.all([
    prisma.grade.findMany({
      where: {
        teacherId: session.userId,
        student: { classId: { in: uniqueClassIds } },
      },
      select: {
        value: true,
        subjectId: true,
        student: { select: { classId: true } },
      },
    }),
    prisma.assignment.findMany({
      where: {
        teacherId: session.userId,
        classId: { in: uniqueClassIds },
      },
      include: {
        submissions: { select: { studentId: true, status: true } },
        class: { select: { id: true, students: { select: { id: true } } } },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        teacherId: session.userId,
        student: { classId: { in: uniqueClassIds } },
      },
      select: {
        status: true,
        student: { select: { classId: true } },
      },
    }),
  ]);

  // Build per-class stats
  type ClassStats = {
    classId: string;
    className: string;
    studentCount: number;
    topStudents: { name: string; xp: number }[];
    gradesBySubject: { subjectName: string; subjectColor: string; avg: number | null }[];
    gradeDistribution: number[]; // [count for grade 1..6]
    overallAvg: number | null;
    submissionRate: number | null; // 0–100
    worstAssignment: { title: string; rate: number } | null;
    attendanceRate: number | null; // 0–100
  };

  const classStats: ClassStats[] = uniqueClassIds.map((classId) => {
    const classTscs = tscEntries.filter((t) => t.classId === classId);
    const firstEntry = classTscs[0];
    const className = firstEntry?.class.name ?? classId;
    const students = firstEntry?.class.students ?? [];

    // Top 3 by XP
    const topStudents = [...students]
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 3)
      .map((s) => ({ name: s.name, xp: s.xp }));

    // Grade average per subject in this class
    const gradesBySubject = classTscs.map((tsc) => {
      const vals = allGrades
        .filter(
          (g) => g.subjectId === tsc.subjectId && g.student.classId === classId
        )
        .map((g) => g.value);
      return {
        subjectName: tsc.subject.name,
        subjectColor: tsc.subject.color,
        avg: avg(vals),
      };
    });

    // Overall grade distribution
    const classGradeVals = allGrades
      .filter((g) => g.student.classId === classId)
      .map((g) => g.value);
    const gradeDistribution = Array.from({ length: 6 }, (_, i) =>
      classGradeVals.filter((v) => Math.round(v) === i + 1).length
    );
    const overallAvg = avg(classGradeVals);

    // Submission rate
    const classAssignments = allAssignments.filter((a) => a.classId === classId);
    let totalSubmitted = 0;
    let totalExpected = 0;
    let worstRate = Infinity;
    let worstAssignment: { title: string; rate: number } | null = null;

    for (const a of classAssignments) {
      const studentCount = a.class.students.length;
      if (!studentCount) continue;
      const submitted = a.submissions.filter((s) =>
        ["submitted", "graded"].includes(s.status)
      ).length;
      totalSubmitted += submitted;
      totalExpected += studentCount;
      const rate = submitted / studentCount;
      if (rate < worstRate) {
        worstRate = rate;
        worstAssignment = {
          title: a.title,
          rate: Math.round(rate * 100),
        };
      }
    }

    const submissionRate =
      totalExpected > 0
        ? Math.round((totalSubmitted / totalExpected) * 100)
        : null;

    // Attendance rate
    const classAttendance = allAttendance.filter(
      (r) => r.student.classId === classId
    );
    const presentCount = classAttendance.filter(
      (r) => r.status === "anwesend"
    ).length;
    const attendanceRate =
      classAttendance.length > 0
        ? Math.round((presentCount / classAttendance.length) * 100)
        : null;

    return {
      classId,
      className,
      studentCount: students.length,
      topStudents,
      gradesBySubject,
      gradeDistribution,
      overallAvg,
      submissionRate,
      worstAssignment,
      attendanceRate,
    };
  });

  // Global summary
  const totalStudents = uniqueClassIds.reduce((sum, cid) => {
    const entry = tscEntries.find((t) => t.classId === cid);
    return sum + (entry?.class.students.length ?? 0);
  }, 0);
  const classesAtRisk = classStats.filter(
    (c) => c.overallAvg !== null && c.overallAvg >= 4
  ).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Lehrer-Cockpit
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Statistiken
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            {classStats.length} Klassen · {totalStudents} Schüler
          </p>
        </div>
      </header>

      {/* Summary bar */}
      <section className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
        {[
          { label: "Klassen", value: String(classStats.length), icon: GraduationCap, tone: "text-brand" },
          { label: "Schüler", value: String(totalStudents), icon: Users, tone: "text-info" },
          {
            label: "Aufgaben",
            value: String(allAssignments.length),
            icon: CheckCircle2,
            tone: "text-success",
          },
          {
            label: "Klassen mit Risiko",
            value: String(classesAtRisk),
            icon: AlertTriangle,
            tone: classesAtRisk > 0 ? "text-danger" : "text-muted-fg",
          },
        ].map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                {s.label}
              </p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </section>

      {classStats.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-fg">
              Keine Klassen gefunden. Bitte wende dich an den Schul-Admin.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {classStats.map((cls) => (
            <ClassSection key={cls.classId} cls={cls} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-class accordion section ───────────────────────────────────────────────

function ClassSection({
  cls,
}: {
  cls: {
    classId: string;
    className: string;
    studentCount: number;
    topStudents: { name: string; xp: number }[];
    gradesBySubject: { subjectName: string; subjectColor: string; avg: number | null }[];
    gradeDistribution: number[];
    overallAvg: number | null;
    submissionRate: number | null;
    worstAssignment: { title: string; rate: number } | null;
    attendanceRate: number | null;
  };
}) {
  const avgStr = cls.overallAvg
    ? cls.overallAvg.toFixed(1).replace(".", ",")
    : "—";
  const maxGradeCount = Math.max(...cls.gradeDistribution, 1);

  return (
    <details open className="group border border-border">
      <summary className="flex cursor-pointer select-none items-center gap-4 bg-bg px-5 py-4 hover:bg-surface">
        <div className="grid size-10 shrink-0 place-items-center bg-fg font-mono text-sm font-bold text-bg">
          {cls.className}
        </div>
        <div className="flex-1">
          <p className="font-semibold">Klasse {cls.className}</p>
          <p className="text-xs text-muted-fg">{cls.studentCount} Schüler</p>
        </div>
        <div className="flex items-center gap-3">
          {cls.overallAvg && (
            <span
              className={cn(
                "font-mono text-xl font-bold",
                gradeColor(cls.overallAvg)
              )}
            >
              Ø {avgStr}
            </span>
          )}
          <BarChart3 className="size-4 text-muted-fg" strokeWidth={1.75} />
        </div>
      </summary>

      <div className="border-t border-border p-5">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {/* Grade avg per subject */}
          <Card>
            <CardHeader>
              <CardTitle>Noten je Fach</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {cls.gradesBySubject.length === 0 && (
                <p className="text-sm text-muted-fg">Noch keine Noten.</p>
              )}
              {cls.gradesBySubject.map((subj) => (
                <div key={subj.subjectName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: subj.subjectColor }}
                      />
                      {subj.subjectName}
                    </span>
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        subj.avg ? gradeColor(subj.avg) : "text-muted-fg"
                      )}
                    >
                      {subj.avg ? subj.avg.toFixed(1).replace(".", ",") : "—"}
                    </span>
                  </div>
                  {subj.avg && (
                    <Progress
                      value={Math.round(((6 - subj.avg) / 5) * 100)}
                      tone={
                        subj.avg <= 2
                          ? "success"
                          : subj.avg <= 4
                          ? "warning"
                          : "danger"
                      }
                    />
                  )}
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Submission & attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Abgaben &amp; Anwesenheit</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-fg">Abgabequote</span>
                  <span className="font-mono font-semibold">
                    {cls.submissionRate !== null ? `${cls.submissionRate}%` : "—"}
                  </span>
                </div>
                {cls.submissionRate !== null && (
                  <Progress
                    value={cls.submissionRate}
                    tone={
                      cls.submissionRate >= 80
                        ? "success"
                        : cls.submissionRate >= 50
                        ? "brand"
                        : "warning"
                    }
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-fg">Anwesenheitsquote</span>
                  <span className="font-mono font-semibold">
                    {cls.attendanceRate !== null ? `${cls.attendanceRate}%` : "—"}
                  </span>
                </div>
                {cls.attendanceRate !== null && (
                  <Progress
                    value={cls.attendanceRate}
                    tone={
                      cls.attendanceRate >= 90
                        ? "success"
                        : cls.attendanceRate >= 75
                        ? "brand"
                        : "warning"
                    }
                  />
                )}
              </div>
              {cls.worstAssignment && (
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                    Schlechteste Abgabe
                  </p>
                  <p className="mt-1 text-sm font-medium truncate">
                    {cls.worstAssignment.title}
                  </p>
                  <Badge
                    variant={
                      cls.worstAssignment.rate >= 50 ? "warning" : "danger"
                    }
                    className="mt-1"
                  >
                    {cls.worstAssignment.rate}% abgegeben
                  </Badge>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Top performers */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Trophy className="inline size-4 mr-1.5 text-warning" strokeWidth={1.75} />
                Top Schüler
              </CardTitle>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {cls.topStudents.length === 0 ? (
                <p className="px-5 py-3 text-sm text-muted-fg">Keine Daten.</p>
              ) : (
                <ol className="divide-y divide-border border-t border-border">
                  {cls.topStudents.map((s, i) => (
                    <li
                      key={s.name}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center font-mono text-[10px] font-bold",
                          i === 0
                            ? "bg-warning text-bg"
                            : "bg-surface text-muted-fg"
                        )}
                      >
                        {i + 1}
                      </span>
                      <p className="flex-1 truncate text-sm font-medium">
                        {s.name}
                      </p>
                      <p className="font-mono text-xs text-muted-fg">
                        {s.xp} XP
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          {/* Grade distribution */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Notenverteilung</CardTitle>
                <p className="mt-0.5 text-xs text-muted-fg">
                  Ø {avgStr}
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-6 gap-1">
                {cls.gradeDistribution.map((count, i) => {
                  const grade = i + 1;
                  const height = (count / maxGradeCount) * 100;
                  return (
                    <div
                      key={grade}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="flex h-20 w-full items-end bg-surface">
                        <div
                          className={cn("w-full", gradeBarTone(grade))}
                          style={{
                            height:
                              count === 0
                                ? "0%"
                                : `${Math.max(8, height)}%`,
                          }}
                        />
                      </div>
                      <p className="font-mono text-xs font-bold">{count}</p>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-fg">
                        {grade}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            href={`/teach/klassen/${encodeURIComponent(cls.className)}`}
            className="text-xs font-semibold uppercase tracking-wider text-muted-fg underline-offset-2 hover:text-fg hover:underline"
          >
            Klassen-Cockpit öffnen →
          </Link>
        </div>
      </div>
    </details>
  );
}
