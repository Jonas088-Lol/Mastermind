/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getFavoriteSubjects } from "@/lib/actions/grade-prefs";
import { GradeTrendView, type GradePoint, type SubjectAvg } from "@/components/grades/GradeTrend";

export const metadata: Metadata = { title: "Notenverlauf" };

export default async function TeachNotenVerlaufPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  // Alle Noten, die diese Lehrkraft vergeben hat
  const grades = await prisma.grade.findMany({
    where: { teacherId: session.userId },
    select: {
      value: true,
      date: true,
      subjectId: true,
      subject: { select: { name: true, color: true } },
    },
    orderBy: { date: "asc" },
  });
  const favorites = await getFavoriteSubjects(session.userId);

  const allPoints: GradePoint[] = grades.map((g) => ({ date: g.date.toISOString(), value: g.value }));

  const bySubject = new Map<string, { name: string; color: string; points: GradePoint[] }>();
  for (const g of grades) {
    if (!bySubject.has(g.subjectId)) {
      bySubject.set(g.subjectId, { name: g.subject.name, color: g.subject.color, points: [] });
    }
    bySubject.get(g.subjectId)!.points.push({ date: g.date.toISOString(), value: g.value });
  }
  const subjects: SubjectAvg[] = [...bySubject.entries()]
    .map(([subjectId, s]) => ({
      subjectId,
      name: s.name,
      color: s.color,
      average: s.points.reduce((sum, p) => sum + p.value, 0) / s.points.length,
      count: s.points.length,
      firstDate: s.points[0].date,
      points: s.points,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/teach/noten" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notenverlauf</h1>
          <p className="mt-0.5 text-sm text-muted-fg">
            Durchschnitt aller von dir vergebenen Noten über die Zeit
          </p>
        </div>
      </header>

      <GradeTrendView allPoints={allPoints} subjects={subjects} favorites={favorites} />
    </div>
  );
}
