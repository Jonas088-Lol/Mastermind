import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClockAlert,
  GraduationCap,
  Plus,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { CompetenceHeatmap } from "@/components/grades/CompetenceHeatmap";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

interface PageParams { params: Promise<{ slug: string; studentId: string }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { studentId } = await params;
  const user = await prisma.user.findUnique({ where: { id: studentId }, select: { name: true } });
  return { title: `${user?.name ?? "Schüler"} · Profil` };
}

export default async function StudentProfilePage({ params }: PageParams) {
  const { slug, studentId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const student = await prisma.user.findUnique({
    where: { id: studentId, role: "student" },
    select: {
      id: true,
      name: true,
      email: true,
      klasse: true,
      xp: true,
      streak: true,
      createdAt: true,
      schoolClass: { select: { id: true, name: true } },
    },
  });
  if (!student) notFound();

  const now = new Date();
  const semesterStart = new Date(now.getFullYear(), now.getMonth() >= 8 ? 8 : -4, 1);

  const [grades, recentAbsences, submissions, achievements] = await Promise.all([
    prisma.grade.findMany({
      where: { studentId },
      include: { subject: { select: { name: true, shortName: true, color: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.absence.findMany({
      where: { studentId, fromDate: { gte: semesterStart } },
      orderBy: { fromDate: "desc" },
      take: 20,
    }),
    prisma.submission.findMany({
      where: { studentId, status: { in: ["submitted", "graded"] } },
      include: {
        assignment: {
          select: {
            title: true,
            dueAt: true,
            subject: { select: { name: true, shortName: true, color: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 10,
    }),
    prisma.userAchievement.findMany({
      where: { userId: studentId },
      orderBy: { unlockedAt: "desc" },
      take: 5,
    }),
  ]);

  // Grade avg overall
  const allValues = grades.map((g) => g.value);
  const overallAvg = allValues.length
    ? allValues.reduce((a, b) => a + b, 0) / allValues.length
    : null;

  // Grades by subject
  const bySubject = new Map<string, { name: string; shortName: string; color: string; values: number[] }>();
  for (const g of grades) {
    const entry = bySubject.get(g.subjectId) ?? { ...g.subject, values: [] };
    entry.values.push(g.value);
    bySubject.set(g.subjectId, entry);
  }
  const subjectAvgs = Array.from(bySubject.entries())
    .map(([id, s]) => ({
      id,
      name: s.name,
      shortName: s.shortName,
      color: s.color,
      avg: s.values.reduce((a, b) => a + b, 0) / s.values.length,
      count: s.values.length,
    }))
    .sort((a, b) => a.avg - b.avg);

  // Kompetenz-Heatmap: Themen-Noten → Fach × Thema
  const topicGrades = grades.filter((g) => g.topic);
  const heatTopics = [...new Set(topicGrades.map((g) => g.topic!))].sort();
  const heatSubjects = [...new Set(topicGrades.map((g) => g.subject.name))].sort();
  const topicHeatmap = {
    topics: heatTopics,
    rows: heatSubjects.map((subjName) => ({
      label: subjName,
      cells: heatTopics.map((topic) => {
        const vals = topicGrades
          .filter((g) => g.subject.name === subjName && g.topic === topic)
          .map((g) => g.value);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      }),
    })),
  };

  // Absence counts
  const confirmed = recentAbsences.filter((a) => a.status === "confirmed").length;
  const pending = recentAbsences.filter((a) => a.status === "pending").length;
  const rejected = recentAbsences.filter((a) => a.status === "rejected").length;

  const STATUS_LABEL: Record<string, string> = {
    confirmed: "Bestätigt",
    pending: "Ausstehend",
    rejected: "Abgelehnt",
  };
  const STATUS_TONE: Record<string, string> = {
    confirmed: "text-success",
    pending: "text-warning",
    rejected: "text-danger",
  };

  const overallAvgStr = overallAvg ? overallAvg.toFixed(1).replace(".", ",") : "—";
  const joinedDate = student.createdAt.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-5">
        <Link
          href={`/teach/klassen/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Klasse {decodeURIComponent(slug)}
        </Link>

        <div className="flex items-start gap-5">
          <Avatar name={student.name} size="lg" className="size-16 text-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
              {student.schoolClass?.name ? `Klasse ${student.schoolClass.name} · ` : ""}Schülerprofil
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{student.name}</h1>
            <p className="mt-1 text-sm text-muted-fg">{student.email} · dabei seit {joinedDate}</p>
          </div>
          {student.schoolClass && (
            <Link
              href={`/teach/noten/neu?classId=${student.schoolClass.id}&studentId=${studentId}&classSlug=${encodeURIComponent(slug)}`}
              className="flex shrink-0 items-center gap-2 bg-fg px-4 py-2 text-sm font-semibold text-bg hover:bg-fg/90"
            >
              <Plus className="size-4" />
              Note eintragen
            </Link>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
        {[
          { label: "Ø-Note", value: overallAvgStr, icon: GraduationCap, tone: overallAvg && overallAvg >= 4 ? "text-danger" : overallAvg && overallAvg >= 3 ? "text-warning" : "text-success" },
          { label: "XP", value: student.xp.toLocaleString("de-DE"), icon: Zap, tone: "text-brand" },
          { label: "Streak", value: String(student.streak), icon: Trophy, tone: "text-warning" },
          { label: "Abgaben", value: String(submissions.length), icon: CheckCircle2, tone: "text-success" },
        ].map((s) => (
          <div key={s.label} className="bg-bg p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-mono text-2xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </section>

      {/* Kompetenz-Heatmap — Themen-Noten dieses Schülers */}
      {topicHeatmap.topics.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold">Kompetenzen nach Thema</h2>
          <CompetenceHeatmap topics={topicHeatmap.topics} rows={topicHeatmap.rows} rowHeader="Fach" />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Noten nach Fach */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Noten nach Fach</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">{grades.length} Noten gesamt</p>
            </div>
          </CardHeader>
          <CardBody>
            {subjectAvgs.length === 0 ? (
              <p className="text-sm text-muted-fg">Noch keine Noten.</p>
            ) : (
              <div className="space-y-3">
                {subjectAvgs.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="w-20 truncate text-sm font-medium">{s.shortName}</span>
                    <div className="flex-1 h-1.5 bg-border">
                      <div
                        className={cn(
                          "h-1.5",
                          s.avg <= 2 ? "bg-success" : s.avg <= 3 ? "bg-brand" : s.avg <= 4 ? "bg-warning" : "bg-danger"
                        )}
                        style={{ width: `${Math.min(100, ((6 - s.avg) / 5) * 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "w-10 text-right font-mono text-sm font-bold",
                      s.avg >= 4.5 ? "text-danger" : s.avg >= 3.5 ? "text-warning" : "text-fg"
                    )}>
                      {s.avg.toFixed(1).replace(".", ",")}
                    </span>
                    <span className="w-14 text-right text-xs text-muted-fg">({s.count})</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Fehlzeiten */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Fehlzeiten (Halbjahr)</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">{recentAbsences.length} Einträge</p>
            </div>
            {pending > 0 && <Badge variant="warning">{pending} ausstehend</Badge>}
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <div className="grid grid-cols-3 border-t border-border">
              {[
                { label: "Bestätigt", value: confirmed, tone: "text-success" },
                { label: "Ausstehend", value: pending, tone: "text-warning" },
                { label: "Abgelehnt", value: rejected, tone: "text-danger" },
              ].map((item) => (
                <div key={item.label} className="border-r border-border px-4 py-3 last:border-r-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{item.label}</p>
                  <p className={cn("mt-1 font-mono text-xl font-bold", item.tone)}>{item.value}</p>
                </div>
              ))}
            </div>
            {recentAbsences.length > 0 && (
              <ul className="divide-y divide-border border-t border-border">
                {recentAbsences.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <Calendar className="size-3.5 shrink-0 text-muted-fg" strokeWidth={1.75} />
                    <span className="font-mono text-xs text-muted-fg">
                      {a.fromDate.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                      {a.fromDate.toDateString() !== a.toDate.toDateString() && (
                        <> – {a.toDate.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</>
                      )}
                    </span>
                    <span className={cn("text-xs font-medium", STATUS_TONE[a.status] ?? "text-muted-fg")}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    {a.reason && (
                      <span className="truncate text-xs text-muted-fg">{a.reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Letzte Abgaben */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Letzte Abgaben</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">{submissions.length} Abgaben</p>
          </div>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {submissions.length === 0 ? (
            <p className="border-t border-border px-5 py-6 text-sm text-muted-fg">Noch keine Abgaben.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {submissions.map((s) => {
                const isLate = s.submittedAt && s.assignment.dueAt < s.submittedAt;
                return (
                  <li key={s.id} className="flex items-center gap-4 px-5 py-3">
                    <span
                      className="size-2 shrink-0"
                      style={{ backgroundColor: s.assignment.subject.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.assignment.title}</p>
                      <p className="text-xs text-muted-fg">{s.assignment.subject.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLate && (
                        <Badge variant="warning">
                          <ClockAlert className="size-3" />
                          Zu spät
                        </Badge>
                      )}
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                        {s.submittedAt?.toLocaleDateString("de-DE", { day: "numeric", month: "short" }) ?? "—"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Notenhistorie */}
      {grades.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Notenhistorie</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">{grades.length} Noten</p>
            </div>
            <span className="font-mono text-2xl font-bold">{overallAvgStr}</span>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {grades.slice(0, 15).map((g) => (
                <li key={g.id} className="flex items-center gap-4 px-5 py-2.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: g.subject.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{g.subject.name}</p>
                    {g.comment && (
                      <p className="text-xs text-muted-fg">{g.comment}</p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                    {g.date.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                  </span>
                  <span className={cn(
                    "w-10 text-right font-mono text-lg font-bold",
                    g.value >= 4.5 ? "text-danger" : g.value >= 3.5 ? "text-warning" : "text-fg"
                  )}>
                    {g.value.toFixed(1).replace(".", ",")}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Achievements</CardTitle>
            </div>
            <Badge variant="brand">{achievements.length}</Badge>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className="inline-flex items-center gap-1.5 border border-border bg-surface px-3 py-1.5 text-xs font-semibold"
                >
                  <BookOpen className="size-3 text-brand" />
                  {a.slug}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
