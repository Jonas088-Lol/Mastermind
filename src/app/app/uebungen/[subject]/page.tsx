/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { SUBJECT_INFO, subjectLabel, subjectVisual } from "@/lib/exercise-visuals";

interface PageParams {
  params: Promise<{ subject: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { subject } = await params;
  return { title: `${subjectLabel(subject)} — Klasse wählen` };
}

export default async function SubjectPage({ params }: PageParams) {
  const { subject } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const label = subjectLabel(subject);
  const description = SUBJECT_INFO[subject]?.description ?? "Interaktive Übungen";
  const visual = subjectVisual(subject);

  const grades = await prisma.exerciseTopic.findMany({
    where: { subject },
    select: { grade: true },
    distinct: ["grade"],
    orderBy: { grade: "asc" },
  });

  const gradeNums = grades.map((g) => g.grade);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <Link href="/app/uebungen" className="mb-4 inline-flex items-center gap-2 text-xs text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" />
          Alle Fächer
        </Link>
        <div className="flex items-center gap-3">
          <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${visual.color}`}>
            <visual.icon className="size-7" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{label}</h1>
            <p className="mt-0.5 text-sm text-muted-fg">{description}</p>
          </div>
        </div>
      </header>

      {gradeNums.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-fg">Noch keine Themen für dieses Fach vorhanden.</p>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Klassenstufe wählen
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {gradeNums.map((grade) => (
              <Link
                key={grade}
                href={`/app/uebungen/${subject}/${grade}`}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-bg p-4 text-center transition-colors hover:border-brand hover:bg-brand/5"
              >
                <span className="text-2xl font-bold tracking-tight">{grade}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-fg">
                  Klasse
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
