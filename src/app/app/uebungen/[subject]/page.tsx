/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getMaxUnlockedGradeFromMastery } from "@/lib/skill-graph";
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

  const [grades, masteries] = await Promise.all([
    prisma.exerciseTopic.findMany({
      where: { subject },
      select: { grade: true },
      distinct: ["grade"],
      orderBy: { grade: "asc" },
    }),
    prisma.userSkillMastery.findMany({
      where: { userId: session.userId, masteryTier: { gte: 1 } },
      select: { nodeSlug: true, masteryTier: true },
    }),
  ]);

  const masteryMap = Object.fromEntries(masteries.map((m) => [m.nodeSlug, { tier: m.masteryTier }]));
  const maxGrade = getMaxUnlockedGradeFromMastery(subject, masteryMap);
  const gradeNums = grades.map((g) => g.grade);
  const hasLockedGrades = gradeNums.some((g) => g > maxGrade);

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
            {gradeNums.map((grade) => {
              const locked = grade > maxGrade;
              if (locked) {
                return (
                  <div
                    key={grade}
                    className="flex flex-col items-center gap-1 border border-border/40 bg-surface/50 p-4 text-center opacity-50 cursor-not-allowed select-none"
                    title={`Schalte höhere Skill-Stufen frei, um Klasse ${grade} zu entsperren`}
                  >
                    <Lock className="size-4 text-muted-fg" />
                    <span className="text-2xl font-bold tracking-tight text-muted-fg">{grade}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-fg">
                      Klasse
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={grade}
                  href={`/app/uebungen/${subject}/${grade}`}
                  className="flex flex-col items-center gap-1 border border-border bg-bg p-4 text-center transition-colors hover:border-brand hover:bg-brand/5"
                >
                  <span className="text-2xl font-bold tracking-tight">{grade}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-fg">
                    Klasse
                  </span>
                </Link>
              );
            })}
          </div>

          {hasLockedGrades && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <span className="mt-0.5 text-base">💡</span>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Höhere Klassenstufen sind gesperrt.{" "}
                <Link href="/app/skills" className="font-bold underline underline-offset-2">
                  Skill-Bäume
                </Link>{" "}
                leveln um Klasse {maxGrade + 1}–13 freizuschalten.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
