import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { saveGrade } from "./actions";

export const metadata: Metadata = { title: "Note eintragen" };

interface PageProps {
  searchParams: Promise<{ classId?: string; studentId?: string; classSlug?: string }>;
}

const GRADE_TYPES = [
  { value: "klausur", label: "Klausur" },
  { value: "test", label: "Test" },
  { value: "muendlich", label: "Mündlich" },
  { value: "hausaufgabe", label: "Hausaufgabe" },
  { value: "projekt", label: "Projekt" },
];

export default async function NoteNeuPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const { classId, studentId: preSelectedStudentId, classSlug } = await searchParams;
  if (!classId) redirect("/teach/klassen");

  const [schoolClass, tscEntries] = await Promise.all([
    prisma.schoolClass.findUnique({
      where: { id: classId },
      include: { students: { where: { role: "student" }, select: { id: true, name: true }, orderBy: { name: "asc" } } },
    }),
    prisma.teacherSubjectClass.findMany({
      where: { teacherId: session.userId, classId },
      include: { subject: { select: { id: true, name: true } } },
    }),
  ]);

  if (!schoolClass) redirect("/teach/klassen");

  const today = new Date().toISOString().slice(0, 10);
  const slug = classSlug ?? schoolClass.name;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <header>
        <Link
          href={`/teach/klassen/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Klasse {schoolClass.name}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Note eintragen</h1>
        <p className="mt-1 text-sm text-muted-fg">Klasse {schoolClass.name}</p>
      </header>

      <form action={saveGrade} className="flex flex-col gap-5">
        <input type="hidden" name="classSlug" value={slug} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Schüler</label>
          <select
            name="studentId"
            required
            defaultValue={preSelectedStudentId ?? ""}
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Schüler wählen…</option>
            {schoolClass.students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Fach</label>
          <select
            name="subjectId"
            required
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Fach wählen…</option>
            {tscEntries.map((t) => (
              <option key={t.subject.id} value={t.subject.id}>{t.subject.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Note (1–6)</label>
            <input
              name="value"
              type="number"
              min="1"
              max="6"
              step="0.5"
              required
              placeholder="z. B. 2.5"
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
            />
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
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Art</label>
          <div className="flex flex-wrap gap-3">
            {GRADE_TYPES.map((t) => (
              <label key={t.value} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input type="radio" name="type" value={t.value} defaultChecked={t.value === "test"} />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Thema <span className="font-normal text-muted-fg">(optional — Basis für die Kompetenz-Heatmap)</span></label>
          <input
            name="topic"
            type="text"
            placeholder="z. B. Bruchrechnung"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Kommentar <span className="font-normal text-muted-fg">(optional)</span></label>
          <input
            name="comment"
            type="text"
            placeholder="z. B. Nachschreibtermin"
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
        >
          Note speichern
        </button>
      </form>
    </div>
  );
}
