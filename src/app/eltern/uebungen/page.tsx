import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Übungen" };

export default async function ElternUebungenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect("/");

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: { student: { select: { id: true, name: true, classId: true } } },
  });

  // Offene (nicht erledigte) Lehrer-Aufgaben pro Kind
  const children = await Promise.all(
    links
      .filter((l) => l.student.classId)
      .map(async (l) => {
        const exercises = await prisma.teacherExercise.findMany({
          where: {
            classId: l.student.classId!,
            completions: { none: { studentId: l.student.id } },
          },
          include: { teacher: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        });
        return { student: l.student, exercises };
      })
  );

  const totalOpen = children.reduce((s, c) => s + c.exercises.length, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Eltern</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Übungen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {totalOpen > 0
            ? `${totalOpen} offene Aufgabe${totalOpen !== 1 ? "n" : ""} von Lehrkräften`
            : "Alle Aufgaben erledigt"}
        </p>
      </header>

      {children.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpen className="size-10 text-muted-fg/40" />
          <p className="font-semibold text-muted-fg">Kein Kind verknüpft</p>
          <p className="text-sm text-muted-fg">Wende dich an die Schulverwaltung, um dein Kind zu verknüpfen.</p>
        </div>
      ) : (
        children.map(({ student, exercises }) => (
          <section key={student.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">{student.name}</h2>
            {exercises.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg p-4 text-sm text-muted-fg">
                <CheckCircle2 className="size-5 text-green-500" />
                Keine offenen Aufgaben 🎉
              </div>
            ) : (
              exercises.map((ex) => (
                <div key={ex.id} className="rounded-2xl border border-border bg-bg p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{ex.title}</p>
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                      {ex.subject}
                    </span>
                    <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-fg">
                      {ex.topic}
                    </span>
                  </div>
                  {ex.description && (
                    <p className="mt-1.5 text-sm text-muted-fg line-clamp-3">{ex.description}</p>
                  )}
                  <p className="mt-1.5 text-xs text-muted-fg">
                    Von {ex.teacher.name} · erstellt am {ex.createdAt.toLocaleDateString("de-DE")}
                  </p>
                </div>
              ))
            )}
          </section>
        ))
      )}
    </div>
  );
}
