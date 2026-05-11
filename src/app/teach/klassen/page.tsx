import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Klassen" };

export default async function ClassesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      subject: { select: { name: true, shortName: true, color: true } },
      class: {
        include: {
          students: { select: { id: true } },
          assignments: {
            where: { teacherId: session.userId },
            select: { id: true },
          },
        },
      },
    },
  });

  // Deduplicate by classId (one entry per class per teacher)
  const seen = new Set<string>();
  const classes = tscEntries
    .filter((t) => {
      if (seen.has(t.class.id)) return false;
      seen.add(t.class.id);
      return true;
    })
    .map((t) => ({
      id: t.class.id,
      name: t.class.name,
      grade: t.class.grade,
      subject: t.subject.name,
      subjectColor: t.subject.color,
      studentCount: t.class.students.length,
      assignmentCount: t.class.assignments.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schuljahr 2025/26</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Deine Klassen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {classes.length} Klassen · {totalStudents} Schüler
        </p>
      </header>

      {classes.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <Users className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">Keine Klassen zugewiesen</p>
          <p className="mt-1 text-sm text-muted-fg">Wende dich an deinen Schuladmin.</p>
        </div>
      ) : (
        <div className="grid gap-px border border-border bg-border md:grid-cols-2">
          {classes.map((c) => (
            <Link
              key={c.id}
              href={`/teach/klassen/${c.name}`}
              className="group flex flex-col gap-5 bg-bg p-6 transition-colors hover:bg-surface"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="grid size-14 place-items-center text-white"
                    style={{ backgroundColor: c.subjectColor }}
                  >
                    <span className="font-mono text-lg font-bold">{c.name}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">{c.subject}</h2>
                    <p className="text-xs text-muted-fg">
                      {c.studentCount} Schüler · Klasse {c.grade}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{c.assignmentCount} Aufgaben</Badge>
              </div>

              <div className="grid grid-cols-2 gap-px border border-border bg-border">
                <div className="bg-bg px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Schüler</p>
                  <p className="mt-0.5 font-mono text-lg font-bold">{c.studentCount}</p>
                </div>
                <div className="bg-bg px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Aufgaben</p>
                  <p className="mt-0.5 font-mono text-lg font-bold">{c.assignmentCount}</p>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-1 text-xs font-medium text-muted-fg transition-colors group-hover:text-brand">
                Cockpit öffnen
                <ArrowRight className="size-3.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
