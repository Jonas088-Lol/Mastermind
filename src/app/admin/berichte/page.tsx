/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Download,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Berichte · Admin" };

export default async function AdminBerichtePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const schoolId = session.schoolId ?? "";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    subjects,
    submissionStats,
    absencesThisMonth,
    absencesLastMonth,
    aiQuotaResult,
    activeStudentIds,
    classes,
  ] = await Promise.all([
    // All subjects with grades for this school
    prisma.subject.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        grades: {
          select: { value: true },
        },
      },
    }),
    // Submission stats: submitted vs total
    prisma.submission.findMany({
      where: {
        assignment: { class: { schoolId } },
      },
      select: { status: true },
    }),
    // Absences this month
    prisma.absence.count({
      where: { schoolId, fromDate: { gte: startOfMonth } },
    }),
    // Absences last month
    prisma.absence.count({
      where: {
        schoolId,
        fromDate: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    // AI quota this month
    prisma.aiQuotaEntry.aggregate({
      where: {
        user: { schoolId },
        updatedAt: { gte: startOfMonth },
      },
      _sum: { used: true },
    }),
    // Active students (xp earned in last 30 days)
    prisma.xpLog.findMany({
      where: {
        user: { schoolId, role: "student" },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
    // Classes with their students' grades
    prisma.schoolClass.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        students: {
          select: {
            studentGrades: { select: { value: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Compute subject averages
  const subjectAverages = subjects
    .map((s) => {
      const vals = s.grades.map((g) => g.value);
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return { name: s.name, avg, count: vals.length };
    })
    .filter((s) => s.avg !== null)
    .sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0));

  // Submission rate
  const totalSubmissions = submissionStats.length;
  const submittedCount = submissionStats.filter(
    (s) => s.status === "submitted" || s.status === "graded"
  ).length;
  const submissionRate =
    totalSubmissions > 0 ? Math.round((submittedCount / totalSubmissions) * 100) : 0;

  const absenceDelta = absencesThisMonth - absencesLastMonth;
  const aiQuotaUsed = aiQuotaResult._sum.used ?? 0;
  const activeStudents = activeStudentIds.length;

  // Top 5 classes by average grade (lower = better in German system)
  const classAverages = classes
    .map((c) => {
      const allGrades = c.students.flatMap((s) => s.studentGrades.map((g) => g.value));
      const avg =
        allGrades.length > 0
          ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length
          : null;
      return { name: c.name, avg, count: allGrades.length };
    })
    .filter((c) => c.avg !== null)
    .sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))
    .slice(0, 5);

  const statsCards = [
    {
      label: "Abgabequote",
      value: `${submissionRate}%`,
      sub: `${submittedCount} von ${totalSubmissions} abgegeben`,
      icon: BookOpen,
      tone: submissionRate >= 80 ? "success" : submissionRate >= 50 ? "warning" : "danger",
    },
    {
      label: "Fehlzeiten (Monat)",
      value: absencesThisMonth.toString(),
      sub:
        absenceDelta === 0
          ? "Gleich wie Vormonat"
          : absenceDelta > 0
          ? `+${absenceDelta} gegenüber Vormonat`
          : `${absenceDelta} gegenüber Vormonat`,
      icon: absenceDelta > 0 ? TrendingUp : TrendingDown,
      tone: absenceDelta > 0 ? "danger" : "success",
    },
    {
      label: "KI-Quota (Monat)",
      value: aiQuotaUsed.toLocaleString("de-DE"),
      sub: "Tokens insgesamt verbraucht",
      icon: BarChart3,
      tone: "info",
    },
    {
      label: "Aktive Schüler/innen",
      value: activeStudents.toString(),
      sub: "XP in den letzten 30 Tagen",
      icon: Users,
      tone: "success",
    },
  ] as const;

  const TONE_COLOR: Record<string, string> = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-brand",
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Berichte</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Schulweite Auswertungen · Noten · Abgaben · Aktivität
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="flex items-center gap-4 bg-bg p-5">
              <Icon className={`size-5 shrink-0 ${TONE_COLOR[card.tone]}`} strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                  {card.label}
                </p>
                <p className={`mt-1 font-mono text-2xl font-bold ${TONE_COLOR[card.tone]}`}>
                  {card.value}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-fg truncate">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject Averages */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Notendurchschnitt nach Fach</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">{subjectAverages.length} Fächer mit Noten</p>
            </div>
            <BarChart3 className="size-5 text-muted-fg" strokeWidth={1.75} />
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            {subjectAverages.length === 0 ? (
              <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
                Noch keine Noten erfasst.
              </div>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {subjectAverages.map((s) => {
                  const avg = s.avg ?? 0;
                  const isGood = avg <= 2.5;
                  const isMid = avg <= 3.5;
                  return (
                    <li key={s.name} className="flex items-center gap-4 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{s.name}</p>
                        <p className="text-[11px] text-muted-fg">{s.count} Noten</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isGood ? (
                          <TrendingDown className="size-3.5 text-success" />
                        ) : isMid ? (
                          <TrendingUp className="size-3.5 text-warning" />
                        ) : (
                          <TrendingUp className="size-3.5 text-danger" />
                        )}
                        <Badge
                          variant={isGood ? "success" : isMid ? "warning" : "danger"}
                        >
                          Ø {avg.toFixed(2)}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Top 5 Classes */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top 5 Klassen nach Note</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">Niedrigster Notendurchschnitt</p>
            </div>
            <Users className="size-5 text-muted-fg" strokeWidth={1.75} />
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            {classAverages.length === 0 ? (
              <div className="border-t border-border px-5 py-6 text-sm text-muted-fg">
                Noch keine Notendaten vorhanden.
              </div>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {classAverages.map((c, i) => {
                  const avg = c.avg ?? 0;
                  return (
                    <li key={c.name} className="flex items-center gap-4 px-5 py-3">
                      <span className="font-mono text-sm font-bold text-muted-fg w-5 text-center">
                        {i + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Klasse {c.name}</p>
                        <p className="text-[11px] text-muted-fg">{c.count} Noten</p>
                      </div>
                      <Badge variant={avg <= 2.5 ? "success" : avg <= 3.5 ? "warning" : "danger"}>
                        Ø {avg.toFixed(2)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Daten-Export */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Daten-Export</CardTitle>
            <p className="mt-1 text-sm text-muted-fg">
              Schuldaten als CSV herunterladen (für Excel geeignet)
            </p>
          </div>
          <Download className="size-5 text-muted-fg" strokeWidth={1.75} />
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { href: "/api/admin/export/nutzer", label: "Nutzerliste", sub: "Name, E-Mail, Rolle, Klasse" },
              { href: "/api/admin/export/noten", label: "Noten", sub: "Schüler, Fach, Note, Art" },
              { href: "/api/admin/export/fehlzeiten", label: "Fehlzeiten", sub: "Anwesenheit & Gründe" },
            ].map((e) => (
              <a
                key={e.href}
                href={e.href}
                download
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-brand"
              >
                <Download className="size-4 shrink-0 text-brand" strokeWidth={1.75} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg">{e.label}</span>
                  <span className="block truncate text-[11px] text-muted-fg">{e.sub}</span>
                </span>
              </a>
            ))}
          </div>
          <p className="text-[11px] text-muted-fg">
            Hinweis: Die Exporte enthalten personenbezogene Daten. Bitte DSGVO-konform behandeln —
            nur für schulische Zwecke verwenden, sicher speichern und nach Gebrauch löschen.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
