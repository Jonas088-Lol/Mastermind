/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Ergebnisse – Arbeitsblatt" };

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default async function WorksheetErgebnissePage({ params }: PageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const worksheet = await prisma.worksheet.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          class: { select: { name: true } },
          submissions: {
            include: {
              student: { select: { name: true } },
              itemAnswers: { select: { isCorrect: true, pointsEarned: true } },
            },
            where: { status: { in: ["submitted", "graded"] } },
          },
        },
      },
      items: { select: { id: true, order: true, points: true }, orderBy: { order: "asc" } },
    },
  });

  if (!worksheet || worksheet.creatorId !== session.userId) notFound();

  // ── Compute overall stats ──────────────────────────────────
  const allSubmissions = worksheet.assignments.flatMap((a) => a.submissions);
  const totalSubmissions = allSubmissions.length;

  const scoresWithMax = allSubmissions.filter(
    (s) => s.score != null && s.maxScore != null && s.maxScore > 0
  );
  const avgScorePct =
    scoresWithMax.length > 0
      ? Math.round(
          scoresWithMax.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) /
            scoresWithMax.length
        )
      : null;

  const timeSubs = allSubmissions.filter((s) => s.timeTakenSec != null);
  const avgTimeSec =
    timeSubs.length > 0
      ? Math.round(timeSubs.reduce((sum, s) => sum + s.timeTakenSec!, 0) / timeSubs.length)
      : null;

  // For completion rate we count students in assigned classes.
  // We need the student count per class for each assignment.
  const classIds = worksheet.assignments
    .map((a) => a.classId)
    .filter((cid): cid is string => cid != null);

  const classStudentCounts = await prisma.user.groupBy({
    by: ["classId"],
    where: { classId: { in: classIds }, role: "student" },
    _count: { id: true },
  });

  const countByClass = Object.fromEntries(
    classStudentCounts
      .filter((r): r is typeof r & { classId: string } => r.classId != null)
      .map((r) => [r.classId, r._count.id])
  );

  const totalStudents = worksheet.assignments.reduce((sum, a) => {
    return sum + (a.classId ? (countByClass[a.classId] ?? 0) : 0);
  }, 0);

  const completionRate =
    totalStudents > 0 ? Math.round((totalSubmissions / totalStudents) * 100) : null;

  // ── Sort all submissions by class name then student name ───
  type FlatSubmission = {
    id: string;
    studentName: string;
    className: string;
    score: number | null;
    maxScore: number | null;
    timeTakenSec: number | null;
    status: string;
  };

  const flatSubmissions: FlatSubmission[] = worksheet.assignments.flatMap((a) =>
    a.submissions.map((s) => ({
      id: s.id,
      studentName: s.student.name,
      className: a.class?.name ?? "—",
      score: s.score,
      maxScore: s.maxScore,
      timeTakenSec: s.timeTakenSec,
      status: s.status,
    }))
  );

  flatSubmissions.sort((a, b) => {
    const classCompare = a.className.localeCompare(b.className, "de");
    if (classCompare !== 0) return classCompare;
    return a.studentName.localeCompare(b.studentName, "de");
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex items-start gap-4">
        <Link
          href={`/teach/arbeitsblatter/${id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
        <Link
          href={`/teach/arbeitsblatter/${id}/live`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Live-Ansicht
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="size-5 text-muted-fg" />
            <h1 className="text-2xl font-bold tracking-tight">{worksheet.title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-fg">Ergebnisse &amp; Statistiken</p>
        </div>
      </header>

      {/* ── Overall stat cards ──────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-fg">
              Abgaben gesamt
            </p>
            <p className="mt-2 text-3xl font-bold">{totalSubmissions}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-fg">
              Ø Ergebnis
            </p>
            <p className="mt-2 text-3xl font-bold">
              {avgScorePct != null ? `${avgScorePct}%` : "—"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-fg">
              Abgabequote
            </p>
            <p className="mt-2 text-3xl font-bold">
              {completionRate != null ? `${completionRate}%` : "—"}
            </p>
            {totalStudents > 0 && (
              <p className="mt-1 text-xs text-muted-fg">
                {totalSubmissions} von {totalStudents}
              </p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-fg">
              Ø Zeit
            </p>
            <p className="mt-2 text-3xl font-bold">
              {avgTimeSec != null ? formatTime(avgTimeSec) : "—"}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ── Per-assignment table ─────────────────────────────── */}
      {worksheet.assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zuweisungen ({worksheet.assignments.length})</CardTitle>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-fg">
                  <th className="px-5 py-3">Klasse</th>
                  <th className="px-5 py-3">Fällig</th>
                  <th className="px-5 py-3">Abgaben</th>
                  <th className="px-5 py-3 w-40">Ø Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {worksheet.assignments.map((a) => {
                  const subs = a.submissions;
                  const withScore = subs.filter(
                    (s) => s.score != null && s.maxScore != null && s.maxScore > 0
                  );
                  const assignAvgPct =
                    withScore.length > 0
                      ? Math.round(
                          withScore.reduce(
                            (sum, s) => sum + (s.score! / s.maxScore!) * 100,
                            0
                          ) / withScore.length
                        )
                      : null;

                  return (
                    <tr key={a.id}>
                      <td className="px-5 py-3 font-medium">{a.class?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-fg">
                        {a.dueAt
                          ? a.dueAt.toLocaleDateString("de-DE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-5 py-3">{subs.length}</td>
                      <td className="px-5 py-3">
                        {assignAvgPct != null ? (
                          <div className="flex items-center gap-2">
                            <Progress value={assignAvgPct} max={100} className="flex-1" />
                            <span className="w-10 text-right text-xs text-muted-fg">
                              {assignAvgPct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-fg">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* ── Student results table ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Schülerergebnisse ({flatSubmissions.length})</CardTitle>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {flatSubmissions.length === 0 ? (
            <div className="border-t border-border px-5 py-8 text-center text-sm text-muted-fg">
              Noch keine Abgaben vorhanden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-fg">
                    <th className="px-5 py-3">Schüler</th>
                    <th className="px-5 py-3">Klasse</th>
                    <th className="px-5 py-3">Punkte</th>
                    <th className="px-5 py-3">%</th>
                    <th className="px-5 py-3">Zeit</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {flatSubmissions.map((sub) => {
                    const pct =
                      sub.score != null && sub.maxScore != null && sub.maxScore > 0
                        ? Math.round((sub.score / sub.maxScore) * 100)
                        : null;

                    return (
                      <tr key={sub.id} className="hover:bg-surface-1/50">
                        <td className="px-5 py-3 font-medium">{sub.studentName}</td>
                        <td className="px-5 py-3 text-muted-fg">{sub.className}</td>
                        <td className="px-5 py-3">
                          {sub.score != null && sub.maxScore != null
                            ? `${sub.score}/${sub.maxScore}`
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          {pct != null ? (
                            <span
                              className={
                                pct >= 75
                                  ? "text-success"
                                  : pct >= 50
                                    ? "text-warning"
                                    : "text-danger"
                              }
                            >
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-muted-fg">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-muted-fg">
                          {sub.timeTakenSec != null ? formatTime(sub.timeTakenSec) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant={sub.status === "graded" ? "success" : "brand"}
                          >
                            {sub.status === "graded" ? "bewertet" : "abgegeben"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
