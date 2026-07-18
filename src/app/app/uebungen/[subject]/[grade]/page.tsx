/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Layers } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { topicVisual, EXERCISE_BLOCK_SIZE, subjectLabel } from "@/lib/exercise-visuals";

interface PageParams {
  params: Promise<{ subject: string; grade: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { subject, grade } = await params;
  return { title: `${subjectLabel(subject)} Klasse ${grade}` };
}

export default async function GradePage({ params }: PageParams) {
  const { subject, grade: gradeStr } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const grade = parseInt(gradeStr, 10);
  if (isNaN(grade)) notFound();

  const label = subjectLabel(subject);

  const topics = await prisma.exerciseTopic.findMany({
    where: { subject, grade },
    include: {
      _count: { select: { questions: true } },
      progress: { where: { userId: session.userId }, select: { completedAt: true, score: true } },
    },
    orderBy: { order: "asc" },
  });

  if (topics.length === 0) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <Link
          href={`/app/uebungen/${subject}`}
          className="mb-4 inline-flex items-center gap-2 text-xs text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          {label}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          {label} — Klasse {grade}
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          {topics.length} Thema{topics.length !== 1 ? "en" : ""} ·{" "}
          {topics.reduce((s, t) => s + t._count.questions, 0)} Fragen
        </p>
      </header>

      <ol className="space-y-3">
        {topics.map((topic, idx) => {
          const progress = topic.progress[0];
          const isDone = !!progress?.completedAt;
          const qCount = topic._count.questions;
          const blocks = Math.max(1, Math.ceil(qCount / EXERCISE_BLOCK_SIZE));
          const visual = topicVisual(subject, topic.title);

          return (
            <li key={topic.id}>
              <Link
                href={`/app/uebungen/${subject}/${grade}/${topic.id}`}
                className="group flex items-start gap-4 rounded-2xl border border-border bg-bg p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm"
              >
                {/* Themen-Icon im Landing-Symboldesign */}
                <span className={`relative grid size-11 shrink-0 place-items-center rounded-full ${visual.color}`}>
                  <visual.icon className="size-5" strokeWidth={1.75} />
                  {isDone && (
                    <CheckCircle2 className="absolute -bottom-1 -right-1 size-4 rounded-full bg-bg text-success" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold group-hover:text-brand">
                    {idx + 1}. {topic.title}
                  </p>
                  {topic.description && (
                    <p className="mt-0.5 text-sm text-muted-fg">{topic.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-fg">
                    <span className="flex items-center gap-1">
                      <Layers className="size-3" />
                      {blocks} {blocks === 1 ? "Block" : "Blöcke"}
                    </span>
                    <span>{qCount} Fragen</span>
                    {isDone && progress?.score !== null && (
                      <span className="font-medium text-success">
                        Score: {progress.score}%
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
