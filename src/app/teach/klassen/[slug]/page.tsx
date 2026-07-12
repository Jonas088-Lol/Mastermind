/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ClockAlert,
  GraduationCap,
  Grid3X3,
  Mail,
  MessageSquare,
  Pencil,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

interface PageParams { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Klasse ${decodeURIComponent(slug)} · Cockpit` };
}

export default async function ClassDetailPage({ params }: PageParams) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  // Also verify the teacher teaches in this class
  const tscCheck = await prisma.teacherSubjectClass.findFirst({
    where: {
      teacherId: session.userId,
      class: { name: decodeURIComponent(slug), schoolId: session.schoolId ?? "" },
    },
    include: { class: { include: { students: { select: { id: true, name: true, xp: true } } } } },
  });
  if (!tscCheck) notFound();
  const schoolClass = tscCheck.class;

  const studentIds = schoolClass.students.map((s) => s.id);
  const now = new Date();

  const [grades, assignments, tscEntries] = await Promise.all([
    prisma.grade.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, value: true, date: true, subject: { select: { name: true } } },
    }),
    prisma.assignment.findMany({
      where: { classId: schoolClass.id },
      include: {
        subject: { select: { name: true, color: true } },
        submissions: { select: { studentId: true, status: true } },
      },
      orderBy: { dueAt: "desc" },
      take: 8,
    }),
    prisma.teacherSubjectClass.findMany({
      where: { classId: schoolClass.id, teacherId: session.userId },
      include: { subject: { select: { name: true, color: true } } },
    }),
  ]);

  // Per-student grade average
  const gradesByStudent = new Map<string, number[]>();
  for (const g of grades) {
    const arr = gradesByStudent.get(g.studentId) ?? [];
    arr.push(g.value);
    gradesByStudent.set(g.studentId, arr);
  }

  function avg(vals: number[]) {
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const students = schoolClass.students
    .map((s) => {
      const vals = gradesByStudent.get(s.id) ?? [];
      const average = avg(vals);
      return { ...s, average, gradeStr: average ? average.toFixed(1).replace(".", ",") : "—" };
    })
    .sort((a, b) => (a.average ?? 99) - (b.average ?? 99));

  // Grade distribution (1–6)
  const allVals = grades.map((g) => g.value);
  const gradeDist = Array.from({ length: 6 }, (_, i) =>
    allVals.filter((v) => Math.round(v) === i + 1).length
  );
  const classAvg = avg(allVals);
  const classAvgStr = classAvg ? classAvg.toFixed(1).replace(".", ",") : "—";

  // Open / graded assignments
  const openAssignments = assignments.filter((a) => {
    const submitted = a.submissions.filter((s) => s.status === "submitted").length;
    const graded = a.submissions.filter((s) => s.status === "graded").length;
    return submitted + graded < studentIds.length;
  }).length;

  const subjects = tscEntries.map((t) => t.subject.name);
  const subjectLabel = subjects.length ? subjects.join(" · ") : "Klasse";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-5">
        <Link
          href="/teach/klassen"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Alle Klassen
        </Link>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-5">
            <div className="grid size-16 shrink-0 place-items-center bg-fg text-bg">
              <span className="font-mono text-xl font-bold">{schoolClass.name}</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
                Schuljahr 2025/26 · {subjectLabel}
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                Klasse {schoolClass.name}
              </h1>
              <p className="mt-1 text-sm text-muted-fg">
                {schoolClass.students.length} Schüler · Ø {classAvgStr}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/teach/nachrichten"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Mail className="size-3.5" />
              Nachricht
            </Link>
            <Link
              href={`/teach/aufgaben/neu?klasse=${schoolClass.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ClipboardList className="size-3.5" />
              Aufgabe stellen
            </Link>
            <Link
              href={`/teach/klassen/${encodeURIComponent(slug)}/anwesenheit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <UserCheck className="size-3.5" />
              Anwesenheit
            </Link>
            <Link
              href={`/teach/klassen/${encodeURIComponent(slug)}/eltern`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Users className="size-3.5" />
              Elternkontakte
            </Link>
            <Link
              href={`/teach/sitzplan?class=${encodeURIComponent(slug)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Grid3X3 className="size-3.5" />
              Sitzplan
            </Link>
            <Link
              href={`/teach/elterngespraeche?studentId=`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <MessageSquare className="size-3.5" />
              Elterngespräche
            </Link>
            <Link
              href={`/teach/noten/neu?classId=${schoolClass.id}&classSlug=${encodeURIComponent(slug)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="size-3.5" />
              Note eintragen
            </Link>
            <Link
              href="/teach/generator"
              className={cn(buttonVariants({ size: "sm" }), "glow-on-hover")}
            >
              <Sparkles className="size-3.5" />
              Klassenarbeit generieren
            </Link>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
        <StatBox label="Schüler" value={String(schoolClass.students.length)} icon={Users} />
        <StatBox label="Ø-Note" value={classAvgStr} icon={GraduationCap} tone="text-brand" />
        <StatBox label="Aufgaben offen" value={String(openAssignments)} icon={ClipboardList} tone={openAssignments > 0 ? "text-warning" : "text-muted-fg"} />
        <StatBox label="Aufgaben gesamt" value={String(assignments.length)} icon={CheckCircle2} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Students */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Schüler</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">{students.length} Schüler · sortiert nach Note</p>
              </div>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              <div className="hidden border-t border-border bg-surface px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg sm:grid sm:grid-cols-[1fr_auto_auto] sm:gap-4">
                <span>Schüler</span>
                <span className="w-16 text-right">Ø-Note</span>
                <span className="w-16 text-right">XP</span>
              </div>
              <ul className="divide-y divide-border border-t border-border">
                {students.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/teach/klassen/${encodeURIComponent(slug)}/schueler/${s.id}`}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-surface"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={s.name} size="sm" />
                        <p className="truncate text-sm font-semibold">{s.name}</p>
                        {s.average !== null && s.average >= 4.5 && (
                          <Badge variant="danger">
                            <AlertTriangle className="size-3" />
                            Risiko
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        "w-16 text-right font-mono text-sm font-bold",
                        s.average !== null && s.average >= 4.5 ? "text-danger" : s.average !== null && s.average >= 3.5 ? "text-warning" : "text-fg"
                      )}>
                        {s.gradeStr}
                      </p>
                      <p className="w-16 text-right font-mono text-xs text-muted-fg">{s.xp} XP</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Assignments */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Aktuelle Aufgaben</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">{assignments.length} Aufgaben</p>
              </div>
              <Link href="/teach/aufgaben" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Alle
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              <ul className="divide-y divide-border border-t border-border">
                {assignments.map((a) => {
                  const submitted = a.submissions.filter((s) => ["submitted", "graded"].includes(s.status)).length;
                  const pct = studentIds.length ? Math.round((submitted / studentIds.length) * 100) : 0;
                  const isOverdue = a.dueAt < now && submitted < studentIds.length;
                  return (
                    <li key={a.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-block size-2 shrink-0" style={{ backgroundColor: a.subject.color }} />
                          <p className="truncate text-sm font-semibold">{a.title}</p>
                          {isOverdue && <Badge variant="danger">Überfällig</Badge>}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-fg">
                          <ClockAlert className="size-3" />
                          Fällig {a.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="flex w-full items-center gap-3 sm:w-48">
                        <Progress value={pct} tone={pct >= 90 ? "success" : pct >= 50 ? "brand" : "warning"} className="flex-1" />
                        <p className="font-mono text-xs font-semibold tabular-nums">{submitted}/{studentIds.length}</p>
                      </div>
                    </li>
                  );
                })}
                {assignments.length === 0 && (
                  <li className="px-5 py-8 text-center text-sm text-muted-fg">Keine Aufgaben gestellt.</li>
                )}
              </ul>
            </CardBody>
          </Card>

          {/* Grade distribution */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Notenverteilung</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">{allVals.length} benotete Abgaben</p>
              </div>
              <span className="font-mono text-2xl font-bold tracking-tight">{classAvgStr}</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-6 gap-2">
                {gradeDist.map((count, i) => {
                  const grade = i + 1;
                  const maxCount = Math.max(...gradeDist, 1);
                  const height = (count / maxCount) * 100;
                  const tone = grade <= 2 ? "bg-success" : grade === 3 ? "bg-fg/70" : grade === 4 ? "bg-warning" : "bg-danger";
                  return (
                    <div key={grade} className="flex flex-col items-center gap-2">
                      <div className="flex h-28 w-full items-end bg-surface">
                        <div className={cn("w-full", tone)} style={{ height: count === 0 ? "0%" : `${Math.max(8, height)}%` }} />
                      </div>
                      <p className="font-mono text-sm font-bold">{count}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Note {grade}</p>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {/* AI suggestion */}
          <Card className="border-brand/40 bg-gradient-to-br from-brand/8 to-transparent">
            <CardBody className="p-5!">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">KI-Vorschlag</p>
              </div>
              <p className="mt-4 text-base font-semibold leading-snug">
                {classAvg && classAvg > 3.5
                  ? `Klasse ${schoolClass.name} zeigt Schwächen — Wiederholungsstunde empfohlen`
                  : `Klasse ${schoolClass.name} läuft gut — jetzt Klassenarbeit vorbereiten`}
              </p>
              <p className="mt-2 text-sm text-muted-fg">
                {classAvg && classAvg > 3.5
                  ? "Ø-Note über 3,5 — gezielte Förderaufgaben könnten helfen."
                  : "Solide Ø-Note. KA-Generator in 30 Sek. startklar."}
              </p>
              <Link href="/teach/generator" className={cn(buttonVariants({ className: "mt-5 w-full" }))}>
                KA generieren
                <ArrowRight className="size-3.5" />
              </Link>
            </CardBody>
          </Card>

          {/* Risk students */}
          {students.filter((s) => s.average !== null && s.average >= 4).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Risiko-Schüler</CardTitle>
                <Badge variant="danger">{students.filter((s) => s.average !== null && s.average >= 4).length}</Badge>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {students.filter((s) => s.average !== null && s.average >= 4).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={s.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{s.name}</p>
                        <p className="text-xs text-danger">Ø {s.gradeStr}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* Upcoming */}
          <Card>
            <CardHeader>
              <CardTitle>Anstehend</CardTitle>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              {assignments.filter((a) => a.dueAt > now).length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-fg">Keine anstehenden Abgaben.</p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {assignments
                    .filter((a) => a.dueAt > now)
                    .slice(0, 5)
                    .map((a) => (
                      <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                        <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{a.title}</p>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                            {a.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label, value, icon: Icon, tone,
}: {
  label: string; value: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: string;
}) {
  return (
    <div className="bg-bg p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
        <Icon className={cn("size-4", tone ?? "text-muted-fg")} strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
