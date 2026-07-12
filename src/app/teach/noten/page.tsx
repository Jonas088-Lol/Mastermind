/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Download, LayoutList, Plus, Trash2, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { deleteGrade } from "./actions";

export const metadata: Metadata = { title: "Noten · Lehrer" };

const TYPE_LABEL: Record<string, string> = {
  klausur:    "Klausur",
  test:       "Test",
  muendlich:  "Mündlich",
  hausaufgabe:"Hausaufgabe",
  projekt:    "Projekt",
};

export default async function TeachNotenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  // All grades entered by this teacher, grouped by subject + class
  const grades = await prisma.grade.findMany({
    where: { teacherId: session.userId },
    include: {
      student: {
        select: {
          name: true,
          schoolClass: { select: { id: true, name: true } },
        },
      },
      subject: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  // Aggregate by subject
  type SubjectGroup = {
    subjectId: string;
    subjectName: string;
    subjectColor: string;
    grades: typeof grades;
    avg: number;
    count: number;
    classes: Set<string>;
  };

  const bySubject = new Map<string, SubjectGroup>();
  for (const g of grades) {
    const existing = bySubject.get(g.subjectId) ?? {
      subjectId: g.subjectId,
      subjectName: g.subject.name,
      subjectColor: g.subject.color,
      grades: [],
      avg: 0,
      count: 0,
      classes: new Set(),
    };
    existing.grades.push(g);
    existing.count++;
    existing.classes.add(g.student.schoolClass?.name ?? "?");
    bySubject.set(g.subjectId, existing);
  }

  // Compute averages
  for (const sg of bySubject.values()) {
    const totalWeight = sg.grades.reduce((s, g) => s + g.weight, 0);
    sg.avg = totalWeight > 0 ? sg.grades.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight : 0;
  }

  const subjects = Array.from(bySubject.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  const recentGrades = grades.slice(0, 30);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer-Cockpit</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Noten</h1>
          <p className="mt-1 text-sm text-muted-fg">{grades.length} Einträge insgesamt</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/teach/noten/verlauf"
            className="flex items-center gap-2 border border-border px-4 py-2 text-sm font-medium text-muted-fg transition-colors hover:border-fg/30 hover:text-fg"
          >
            <TrendingUp className="size-4" />
            Verlauf
          </Link>
          <Link
            href="/teach/noten/bulk"
            className="flex items-center gap-2 border border-border px-4 py-2 text-sm font-medium text-muted-fg transition-colors hover:border-fg/30 hover:text-fg"
          >
            <LayoutList className="size-4" />
            Klassen-Noten
          </Link>
          <Link
            href="/api/teach/noten-export"
            className="flex items-center gap-2 border border-border px-4 py-2 text-sm font-medium text-muted-fg transition-colors hover:border-fg/30 hover:text-fg"
          >
            <Download className="size-4" />
            CSV
          </Link>
        </div>
      </header>

      {/* Per-subject summary */}
      {subjects.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">Nach Fach</h2>
          <div className="divide-y divide-border border border-border">
            {subjects.map((sg) => (
              <div key={sg.subjectId} className="flex items-center gap-5 bg-bg px-5 py-4">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: sg.subjectColor }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{sg.subjectName}</p>
                  <p className="text-xs text-muted-fg">
                    {Array.from(sg.classes).join(", ")} · {sg.count} Noten
                  </p>
                </div>
                <p className={cn(
                  "font-mono text-lg font-bold tabular-nums",
                  sg.avg >= 4 ? "text-danger" : sg.avg >= 3 ? "text-warning" : "text-success"
                )}>
                  Ø {sg.avg.toFixed(1).replace(".", ",")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent entries */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-fg">Letzte Einträge</h2>
        </div>

        {recentGrades.length === 0 ? (
          <div className="grid place-items-center border border-dashed border-border py-16">
            <p className="text-sm text-muted-fg">Noch keine Noten eingetragen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Schüler</th>
                  <th className="px-4 py-3 text-left">Klasse</th>
                  <th className="px-4 py-3 text-left">Fach</th>
                  <th className="px-4 py-3 text-left">Art</th>
                  <th className="px-4 py-3 text-right">Note</th>
                  <th className="px-4 py-3 text-left">Kommentar</th>
                  <th className="px-4 py-3 text-right">Eintragen</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentGrades.map((g) => {
                  const slug = g.student.schoolClass?.name ?? "";
                  return (
                    <tr key={g.id} className="hover:bg-surface">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-fg">
                        {g.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{g.student.name}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-fg">
                        {g.student.schoolClass?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ backgroundColor: g.subject.color }} />
                          {g.subject.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-fg">{TYPE_LABEL[g.type] ?? g.type}</td>
                      <td className={cn(
                        "px-4 py-2.5 text-right font-mono font-bold tabular-nums",
                        g.value >= 4 ? "text-danger" : g.value >= 3 ? "text-warning" : ""
                      )}>
                        {g.value.toFixed(1).replace(".", ",")}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-2.5 text-xs text-muted-fg">
                        {g.comment ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {slug && (
                          <Link
                            href={`/teach/noten/neu?classId=${g.student.schoolClass?.id}&classSlug=${encodeURIComponent(slug)}`}
                            className="text-xs text-brand hover:underline"
                          >
                            <Plus className="inline size-3.5" /> Note
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <form action={deleteGrade.bind(null, g.id)}>
                          <button type="submit" title="Note löschen" className="text-muted-fg hover:text-danger">
                            <Trash2 className="size-3.5" />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
