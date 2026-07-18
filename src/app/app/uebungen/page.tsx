/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { subjectVisual } from "@/lib/exercise-visuals";
import { TeacherExerciseCard, type TeacherExerciseItem } from "./TeacherExerciseCard";

export const metadata: Metadata = { title: "Übungen" };

// Fächer nach Kategorien gruppiert — die Kategorie steht als kleine Überschrift
// über den jeweiligen Fächern.
const SUBJECT_CATEGORIES: { category: string; subjects: { key: string; label: string }[] }[] = [
  {
    category: "Sprachen",
    subjects: [
      { key: "deutsch",      label: "Deutsch" },
      { key: "englisch",     label: "Englisch" },
      { key: "franzoesisch", label: "Französisch" },
      { key: "spanisch",     label: "Spanisch" },
      { key: "latein",       label: "Latein" },
    ],
  },
  {
    category: "Mathematik & Naturwissenschaften",
    subjects: [
      { key: "mathematik", label: "Mathematik" },
      { key: "physik",     label: "Physik" },
      { key: "chemie",     label: "Chemie" },
      { key: "biologie",   label: "Biologie" },
    ],
  },
  {
    category: "Informatik & Technik",
    subjects: [
      { key: "informatik", label: "Informatik" },
      { key: "technik",    label: "Technik" },
    ],
  },
  {
    category: "Gesellschaft & Wirtschaft",
    subjects: [
      { key: "geschichte", label: "Geschichte" },
      // MEGA-Fragenbank nutzt "erdkunde"; "geografie" bleibt als Alias bestehen.
      { key: "erdkunde",   label: "Erdkunde" },
      { key: "geografie",  label: "Geografie" },
      { key: "wirtschaft", label: "Wirtschaft" },
      { key: "sachkunde",  label: "Sachkunde" },
    ],
  },
  {
    category: "Ethik & Philosophie",
    subjects: [
      { key: "ethik",       label: "Ethik" },
      { key: "philosophie", label: "Philosophie" },
      { key: "psychologie", label: "Psychologie" },
    ],
  },
  {
    category: "Kunst, Musik & Sport",
    subjects: [
      { key: "kunst", label: "Kunst" },
      { key: "musik", label: "Musik" },
      { key: "sport", label: "Sport" },
    ],
  },
];

export default async function UebungenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const counts = await prisma.exerciseTopic.groupBy({
    by: ["subject"],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.subject, c._count.id]));

  const progressMap: Record<string, number> = {};
  const progRows = await prisma.exerciseProgress.groupBy({
    by: ["topicId"],
    where: { userId: session.userId, completedAt: { not: null } },
    _count: { topicId: true },
  });
  for (const row of progRows) {
    progressMap[row.topicId] = row._count.topicId;
  }

  // Aufgaben der eigenen Lehrkräfte für die Klasse des Schülers
  const student = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { classId: true },
  });
  const teacherExercises: TeacherExerciseItem[] = student?.classId
    ? (
        await prisma.teacherExercise.findMany({
          where: { classId: student.classId },
          include: {
            teacher: { select: { name: true } },
            completions: { where: { studentId: session.userId }, select: { id: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      ).map((ex) => ({
        id: ex.id,
        title: ex.title,
        description: ex.description,
        subject: ex.subject,
        topic: ex.topic,
        teacherName: ex.teacher.name,
        createdAt: ex.createdAt.toISOString(),
        done: ex.completions.length > 0,
      }))
    : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Plattformweite Inhalte
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Übungen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Lerne mit interaktiven Aufgaben — wähle ein Fach und dann eine Klassenstufe.
        </p>
      </header>

      {/* Aufgaben der Lehrkräfte — über den vorgefertigten Übungen */}
      {teacherExercises.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Aufgaben deiner Lehrkräfte</h2>
          {teacherExercises.map((ex) => (
            <TeacherExerciseCard key={ex.id} exercise={ex} />
          ))}
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/app/uebungen/stats"
          className="group flex flex-col gap-3 border bg-violet-500/10 p-5 text-violet-600 transition-all hover:shadow-md border-violet-200 dark:border-violet-800 dark:text-violet-400"
        >
          <span className="text-3xl">📊</span>
          <div>
            <p className="font-bold">Meine Statistik</p>
            <p className="mt-0.5 text-xs opacity-70">Deine Quote, Fächer-Vergleich und Aktivität</p>
          </div>
        </Link>
        <Link
          href="/app/uebungen/wiederholen"
          className="group flex flex-col gap-3 border bg-rose-500/10 p-5 text-rose-600 transition-all hover:shadow-md border-rose-200 dark:border-rose-800 dark:text-rose-400"
        >
          <span className="text-3xl">🔁</span>
          <div>
            <p className="font-bold">Fehler wiederholen</p>
            <p className="mt-0.5 text-xs opacity-70">Zuletzt falsch beantwortete Fragen üben</p>
          </div>
        </Link>
      </div>

      {/* Fächer nach Kategorien gruppiert */}
      <div className="flex flex-col gap-8">
        {SUBJECT_CATEGORIES.map((cat) => {
          // Nur Fächer zeigen, die auch Themen haben (sonst wirkt die Kategorie leer).
          const visible = cat.subjects.filter((s) => (countMap[s.key] ?? 0) > 0);
          if (visible.length === 0) return null;
          return (
            <section key={cat.category}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-fg">
                {cat.category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((s) => {
                  const total = countMap[s.key] ?? 0;
                  const visual = subjectVisual(s.key);
                  return (
                    <Link
                      key={s.key}
                      href={`/app/uebungen/${s.key}`}
                      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
                    >
                      <span className={`grid size-14 place-items-center rounded-full ${visual.color}`}>
                        <visual.icon className="size-7" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="font-bold group-hover:text-brand">{s.label}</p>
                        <p className="mt-0.5 text-xs text-muted-fg">{total} Themen</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border bg-bg p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Tipp</p>
        <p className="mt-2 text-sm text-muted-fg">
          Jedes Thema enthält einen kurzen Lerntext und anschließend ein Quiz mit
          verschiedenen Aufgabentypen: Multiple Choice, Lückentext, Wahr/Falsch, Reihenfolge und Zuordnung.
        </p>
      </section>
    </div>
  );
}
