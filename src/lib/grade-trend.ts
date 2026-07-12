/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import type { GradePoint, SubjectAvg } from "@/components/grades/GradeTrend";

// Baut Diagramm-Daten für einen Schüler: alle Notenpunkte + Fach-Durchschnitte.
// Fächer erscheinen erst, sobald die erste Note eingetragen wurde.
export async function buildGradeTrend(studentId: string): Promise<{
  allPoints: GradePoint[];
  subjects: SubjectAvg[];
}> {
  const grades = await prisma.grade.findMany({
    where: { studentId },
    select: {
      value: true,
      date: true,
      subjectId: true,
      subject: { select: { name: true, color: true } },
    },
    orderBy: { date: "asc" },
  });

  const allPoints: GradePoint[] = grades.map((g) => ({
    date: g.date.toISOString(),
    value: g.value,
  }));

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

  return { allPoints, subjects };
}
