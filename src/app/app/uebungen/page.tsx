/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { TeacherExerciseCard, type TeacherExerciseItem } from "./TeacherExerciseCard";

export const metadata: Metadata = { title: "Übungen" };

const SUBJECTS = [
  { key: "mathematik",  label: "Mathematik",  icon: "➕", color: "bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800 dark:text-indigo-400" },
  { key: "deutsch",     label: "Deutsch",     icon: "📖", color: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400" },
  { key: "englisch",    label: "Englisch",    icon: "🌍", color: "bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-800 dark:text-sky-400" },
  { key: "physik",      label: "Physik",      icon: "⚡", color: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800 dark:text-purple-400" },
  { key: "chemie",      label: "Chemie",      icon: "🧪", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400" },
  { key: "biologie",    label: "Biologie",    icon: "🌱", color: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400" },
  { key: "geschichte",  label: "Geschichte",  icon: "🏛️", color: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800 dark:text-red-400" },
  { key: "informatik",  label: "Informatik",  icon: "💻", color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400" },
  { key: "geografie",   label: "Geografie",   icon: "🌐", color: "bg-teal-500/10 text-teal-600 border-teal-200 dark:border-teal-800 dark:text-teal-400" },
  { key: "wirtschaft",  label: "Wirtschaft",  icon: "📈", color: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800 dark:text-orange-400" },
  { key: "musik",       label: "Musik",       icon: "🎵", color: "bg-pink-500/10 text-pink-600 border-pink-200 dark:border-pink-800 dark:text-pink-400" },
  { key: "sport",       label: "Sport",       icon: "🏃", color: "bg-lime-500/10 text-lime-600 border-lime-200 dark:border-lime-800 dark:text-lime-400" },
  // Fächer der MEGA-Fragenbank (Import nutzt "erdkunde", nicht "geografie")
  { key: "erdkunde",    label: "Erdkunde",    icon: "🗺️", color: "bg-teal-500/10 text-teal-600 border-teal-200 dark:border-teal-800 dark:text-teal-400" },
  { key: "franzoesisch",label: "Französisch", icon: "🇫🇷", color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400" },
  { key: "latein",      label: "Latein",      icon: "🏺", color: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400" },
  { key: "spanisch",    label: "Spanisch",    icon: "🇪🇸", color: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800 dark:text-red-400" },
  { key: "kunst",       label: "Kunst",       icon: "🎨", color: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200 dark:border-fuchsia-800 dark:text-fuchsia-400" },
  { key: "ethik",       label: "Ethik",       icon: "⚖️", color: "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-700 dark:text-slate-400" },
  { key: "sachkunde",   label: "Sachkunde",   icon: "🔍", color: "bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:border-cyan-800 dark:text-cyan-400" },
  { key: "technik",     label: "Technik",     icon: "🔧", color: "bg-zinc-500/10 text-zinc-600 border-zinc-200 dark:border-zinc-700 dark:text-zinc-400" },
  { key: "philosophie", label: "Philosophie", icon: "🦉", color: "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800 dark:text-violet-400" },
  { key: "psychologie", label: "Psychologie", icon: "🧠", color: "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800 dark:text-rose-400" },
] as const;

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SUBJECTS.map((s) => {
          const total = countMap[s.key] ?? 0;
          return (
            <Link
              key={s.key}
              href={`/app/uebungen/${s.key}`}
              className={`group flex flex-col gap-3 border p-5 transition-all hover:shadow-md ${s.color}`}
            >
              <span className="text-3xl">{s.icon}</span>
              <div>
                <p className="font-bold">{s.label}</p>
                <p className="mt-0.5 text-xs opacity-70">{total} Themen</p>
              </div>
            </Link>
          );
        })}
      </div>

      <section className="border border-border bg-bg p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Tipp</p>
        <p className="mt-2 text-sm text-muted-fg">
          Jedes Thema enthält einen kurzen Lerntext und anschließend ein Quiz mit
          verschiedenen Aufgabentypen: Multiple Choice, Lückentext, Wahr/Falsch, Reihenfolge und Zuordnung.
        </p>
      </section>
    </div>
  );
}
