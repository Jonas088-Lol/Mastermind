import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { saveBulkAttendance } from "./actions";

export const metadata: Metadata = { title: "Anwesenheit eintragen" };

interface PageParams { params: Promise<{ slug: string }> }

const STATUSES = [
  { value: "anwesend",    label: "A", title: "Anwesend",     cls: "bg-success text-success-fg" },
  { value: "fehlt",       label: "F", title: "Fehlt",        cls: "bg-danger text-danger-fg" },
  { value: "verspaetet",  label: "V", title: "Verspätet",    cls: "bg-warning text-warning-fg" },
  { value: "entschuldigt",label: "E", title: "Entschuldigt", cls: "bg-surface text-muted-fg border border-border" },
];

export default async function AnwesenheitPage({ params }: PageParams) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const schoolClass = await prisma.schoolClass.findFirst({
    where: { name: decodeURIComponent(slug) },
    include: {
      students: {
        where: { role: "student" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!schoolClass) notFound();

  const today = new Date().toISOString().slice(0, 10);

  // Load today's existing standalone records for pre-fill
  const dayStart = new Date(today);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const existing = await prisma.attendanceRecord.findMany({
    where: {
      studentId: { in: schoolClass.students.map((s) => s.id) },
      lessonId: null,
      date: { gte: dayStart, lt: dayEnd },
    },
    select: { studentId: true, status: true },
  });
  const existingMap = new Map(existing.map((r) => [r.studentId, r.status]));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <Link
          href={`/teach/klassen/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Klasse {schoolClass.name}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Anwesenheit</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Klasse {schoolClass.name} · {schoolClass.students.length} Schüler
        </p>
      </header>

      <form action={saveBulkAttendance} className="flex flex-col gap-5">
        <input type="hidden" name="classId" value={schoolClass.id} />
        <input type="hidden" name="classSlug" value={slug} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Datum</label>
          <input
            name="date"
            type="date"
            defaultValue={today}
            className="h-10 w-48 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="divide-y divide-border border border-border">
          {/* Header */}
          <div className="flex items-center gap-3 bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-fg">
            <div className="flex-1">
              <Users className="inline size-3.5 mr-1" />
              Schüler
            </div>
            <div className="flex gap-1">
              {STATUSES.map((s) => (
                <div key={s.value} title={s.title} className="w-9 text-center">{s.label}</div>
              ))}
            </div>
          </div>

          {schoolClass.students.map((student) => {
            const current = existingMap.get(student.id) ?? "anwesend";
            return (
              <div key={student.id} className="flex items-center gap-3 bg-bg px-4 py-3">
                <input type="hidden" name="studentId" value={student.id} />
                <p className="flex-1 text-sm font-medium">{student.name}</p>
                <div className="flex gap-1">
                  {STATUSES.map((s) => (
                    <label key={s.value} title={s.title} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`status_${student.id}`}
                        value={s.value}
                        defaultChecked={current === s.value}
                        className="peer sr-only"
                      />
                      <span className="flex size-9 items-center justify-center border border-border font-mono text-xs font-bold text-muted-fg transition-colors hover:border-fg/40 peer-checked:border-transparent peer-checked:bg-fg peer-checked:text-bg">
                        {s.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
        >
          Anwesenheit speichern
        </button>
      </form>
    </div>
  );
}
