import {
  ArrowRight,
  Brain,
  GraduationCap,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kompetenzen" };

export default async function KompetenzenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      subject: { select: { id: true, name: true, shortName: true, color: true } },
      class: { include: { students: { select: { id: true } } } },
    },
  });

  // Deduplicate by classId + subjectId
  const seen = new Set<string>();
  const unique = tscEntries.filter((t) => {
    const key = `${t.classId}:${t.subjectId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const classIds = [...new Set(unique.map((t) => t.classId))];

  const grades = await prisma.grade.findMany({
    where: {
      teacherId: session.userId,
      student: { classId: { in: classIds } },
    },
    select: {
      value: true,
      date: true,
      subjectId: true,
      student: { select: { classId: true } },
    },
  });

  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  type ClassRow = {
    classId: string;
    className: string;
    subjectName: string;
    subjectColor: string;
    students: number;
    avgPct: number;
    trend: "up" | "down" | "flat";
    bySubject: { label: string; avgPct: number }[];
  };

  const rows: ClassRow[] = unique.map((t) => {
    const studentIds = t.class.students.map((s) => s.id);
    const classGrades = grades.filter(
      (g) => g.subjectId === t.subjectId && g.student.classId === t.classId
    );

    function avg(vals: number[]) {
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    function gradeToPct(g: number) {
      return Math.round(Math.max(0, ((6 - g) / 5) * 100));
    }

    const allVals = classGrades.map((g) => g.value);
    const recentVals = classGrades.filter((g) => g.date >= thirtyDaysAgo).map((g) => g.value);
    const olderVals = classGrades.filter((g) => g.date >= sixtyDaysAgo && g.date < thirtyDaysAgo).map((g) => g.value);

    const avgAll = avg(allVals);
    const avgRecent = avg(recentVals);
    const avgOlder = avg(olderVals);

    let trend: "up" | "down" | "flat" = "flat";
    if (avgRecent !== null && avgOlder !== null) {
      if (avgRecent < avgOlder - 0.2) trend = "up";
      else if (avgRecent > avgOlder + 0.2) trend = "down";
    }

    const avgPct = avgAll ? gradeToPct(avgAll) : 50;

    const bySubject = [
      { label: "Klassenarbeiten", vals: classGrades.filter((g) => g.value <= 6).map((g) => g.value) },
    ].map(({ label, vals }) => ({ label, avgPct: vals.length ? gradeToPct(avg(vals)!) : 50 }));

    return {
      classId: t.classId,
      className: t.class.name,
      subjectName: t.subject.name,
      subjectColor: t.subject.color,
      students: studentIds.length,
      avgPct,
      trend,
      bySubject,
    };
  });

  const totalStudents = [...new Set(unique.flatMap((t) => t.class.students.map((s) => s.id)))].length;
  const atRiskCount = rows.filter((r) => r.avgPct < 50).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Lehrer-Cockpit
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Kompetenzen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {rows.length} Klassen · {totalStudents} Schüler
            {atRiskCount > 0 && (
              <> · <span className="font-semibold text-warning">{atRiskCount} unter 50%</span></>
            )}
          </p>
        </div>
      </header>

      {/* Overview stats */}
      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {[
          { label: "Klassen", value: String(rows.length), icon: GraduationCap, tone: "text-brand" },
          { label: "Schüler gesamt", value: String(totalStudents), icon: Users, tone: "text-info" },
          { label: "Unter 50%", value: String(atRiskCount), icon: Lightbulb, tone: atRiskCount > 0 ? "text-warning" : "text-success" },
          { label: "Benotete", value: String(grades.length), icon: Brain, tone: "text-fg" },
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
            <p className="text-sm text-muted-fg">Du hast noch keine Klassen oder Noten eingetragen.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {rows.map((cls) => (
            <ClassCard key={`${cls.classId}:${cls.subjectName}`} cls={cls} />
          ))}
        </div>
      )}

      {/* AI Suggestion */}
      {rows.length > 0 && (
        <Card className="border-brand/40 bg-gradient-to-br from-brand/[0.08] to-transparent">
          <CardBody className="!p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">KI-Empfehlung</p>
            </div>
            {atRiskCount > 0 ? (
              <>
                <p className="mt-4 text-base font-semibold leading-snug">
                  {atRiskCount} Klasse{atRiskCount > 1 ? "n" : ""} mit unterdurchschnittlichen Ergebnissen
                </p>
                <p className="mt-2 text-sm text-muted-fg">
                  Gezielte Wiederholungsaufgaben oder Differenzierungsblätter könnten helfen.
                  KA-Generator erstellt passende Übungsblätter in 30 Sekunden.
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 text-base font-semibold leading-snug">Alle Klassen über 50% — starkes Ergebnis</p>
                <p className="mt-2 text-sm text-muted-fg">
                  Jetzt ist ein guter Zeitpunkt für eine Klassenarbeit oder ein anspruchsvolles Projekt.
                </p>
              </>
            )}
            <Link href="/teach/generator" className={cn(buttonVariants({ className: "mt-5 w-full" }))}>
              KA-Generator öffnen
              <ArrowRight className="size-3.5" />
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function ClassCard({ cls }: {
  cls: {
    classId: string; className: string; subjectName: string; subjectColor: string;
    students: number; avgPct: number; trend: "up" | "down" | "flat";
    bySubject: { label: string; avgPct: number }[];
  };
}) {
  const TrendIcon = cls.trend === "up" ? TrendingUp : cls.trend === "down" ? TrendingDown : null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="grid size-10 shrink-0 place-items-center font-mono text-sm font-bold text-white"
            style={{ backgroundColor: cls.subjectColor }}
          >
            {cls.className}
          </div>
          <div>
            <CardTitle>{cls.subjectName} · {cls.className}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-fg">{cls.students} Schüler</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {TrendIcon && (
            <TrendIcon
              className={cn("size-4", cls.trend === "up" ? "text-success" : "text-danger")}
              strokeWidth={1.75}
            />
          )}
          <Badge variant={cls.avgPct >= 70 ? "success" : cls.avgPct >= 50 ? "brand" : "warning"}>
            {cls.avgPct}%
          </Badge>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-fg">Gesamtleistung</span>
              <span className="font-mono font-semibold">{cls.avgPct}%</span>
            </div>
            <Progress
              value={cls.avgPct}
              tone={cls.avgPct >= 70 ? "success" : cls.avgPct >= 50 ? "brand" : "warning"}
            />
          </div>
        </div>
        <Link
          href={`/teach/klassen/${encodeURIComponent(cls.className)}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-4 w-full")}
        >
          Klassen-Cockpit öffnen
          <ArrowRight className="size-3.5" />
        </Link>
      </CardBody>
    </Card>
  );
}
