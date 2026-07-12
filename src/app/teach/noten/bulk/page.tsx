/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { saveBulkGrades } from "./actions";

export const metadata: Metadata = { title: "Klassen-Noten eintragen" };

interface PageProps {
  searchParams: Promise<{ classId?: string; subjectId?: string }>;
}

const GRADE_TYPES = [
  { value: "klausur",     label: "Klassenarbeit" },
  { value: "test",        label: "Test" },
  { value: "muendlich",   label: "Mündlich" },
  { value: "hausaufgabe", label: "Hausaufgabe" },
  { value: "projekt",     label: "Projekt" },
];

export default async function BulkNotenPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const { classId, subjectId } = await searchParams;

  // Load all TeacherSubjectClass entries for this teacher to populate selectors
  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      subject: { select: { id: true, name: true } },
      class:   { select: { id: true, name: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  // Deduplicate classes and subjects for the selector
  const classMap = new Map<string, { id: string; name: string }>();
  const subjectMap = new Map<string, { id: string; name: string }>();
  for (const t of tscEntries) {
    classMap.set(t.class.id, t.class);
    subjectMap.set(t.subject.id, t.subject);
  }
  const classes = Array.from(classMap.values());
  const subjects = Array.from(subjectMap.values());

  const today = new Date().toISOString().slice(0, 10);

  // Step 2: classId + subjectId present → show grade entry table
  if (classId && subjectId) {
    const [schoolClass, subject] = await Promise.all([
      prisma.schoolClass.findUnique({
        where: { id: classId },
        include: {
          students: {
            where: { role: "student" },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          },
        },
      }),
      prisma.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, name: true },
      }),
    ]);

    if (!schoolClass || !subject) redirect("/teach/noten/bulk");

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link
            href="/teach/noten/bulk"
            className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            Auswahl
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Noten eintragen (Klasse)</h1>
          <p className="text-sm text-muted-fg">
            Klasse {schoolClass.name} · {subject.name}
          </p>
        </header>

        <form action={saveBulkGrades} className="flex flex-col gap-6">
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="subjectId" value={subjectId} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Art</label>
              <select
                name="gradeType"
                className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
              >
                {GRADE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Datum</label>
              <input
                name="date"
                type="date"
                defaultValue={today}
                className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-semibold">Thema <span className="font-normal text-muted-fg">(optional — Basis für die Kompetenz-Heatmap)</span></label>
              <input
                name="topic"
                type="text"
                placeholder="z. B. Bruchrechnung"
                className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-fg">
              Alle leer lassen = nicht eintragen
            </p>
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    <th className="px-4 py-3 text-left">Schüler</th>
                    <th className="px-4 py-3 text-right w-40">Note (1–6)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {schoolClass.students.map((student) => (
                    <tr key={student.id} className="hover:bg-surface">
                      <td className="px-4 py-2.5 font-medium">{student.name}</td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          name={`grade_${student.id}`}
                          min="1"
                          max="6"
                          step="0.5"
                          placeholder="—"
                          className="h-9 w-24 border border-border bg-bg px-2 text-right text-sm focus:border-brand focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
            >
              Noten speichern
            </button>
            <Link href="/teach/noten" className="text-sm text-muted-fg hover:text-fg">
              Abbrechen
            </Link>
          </div>
        </form>
      </div>
    );
  }

  // Step 1: Class + Subject selector
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/teach/noten"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Noten
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Noten eintragen (Klasse)</h1>
        <p className="text-sm text-muted-fg">
          Wähle Klasse und Fach, um Noten für alle Schüler auf einmal einzutragen.
        </p>
      </header>

      {tscEntries.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <p className="text-sm text-muted-fg">
            Du hast noch keine Klassen/Fächer zugewiesen bekommen.
          </p>
        </div>
      ) : (
        <form
          method="get"
          action="/teach/noten/bulk"
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="classId" className="text-sm font-semibold">
              Klasse
            </label>
            <select
              id="classId"
              name="classId"
              required
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">Klasse wählen…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="subjectId" className="text-sm font-semibold">
              Fach
            </label>
            <select
              id="subjectId"
              name="subjectId"
              required
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">Fach wählen…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
            >
              Weiter
            </button>
          </div>
        </form>
      )}

      <div className="border border-border bg-surface p-4 text-sm text-muted-fg">
        <p className="font-semibold text-fg">Hinweis</p>
        <p className="mt-1 text-xs">
          Nur Klassen und Fächer, die dir zugeordnet sind, werden angezeigt.
          Leer gelassene Felder werden nicht eingetragen.
        </p>
      </div>
    </div>
  );
}
