/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Clock } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

const SUBJECT_LABEL: Record<string, string> = {
  mathematik: "Mathematik", deutsch: "Deutsch", englisch: "Englisch",
  physik: "Physik", chemie: "Chemie", biologie: "Biologie",
  geschichte: "Geschichte", informatik: "Informatik",
};

interface PageParams {
  params: Promise<{ subject: string; grade: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { subject, grade } = await params;
  const label = SUBJECT_LABEL[subject] ?? subject;
  return { title: `${label} Klasse ${grade}` };
}

export default async function GradePage({ params }: PageParams) {
  const { subject, grade: gradeStr } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const grade = parseInt(gradeStr, 10);
  if (isNaN(grade)) notFound();

  const label = SUBJECT_LABEL[subject];
  if (!label) notFound();

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

          return (
            <li key={topic.id}>
              <Link
                href={`/app/uebungen/${subject}/${grade}/${topic.id}`}
                className="group flex items-start gap-4 border border-border bg-bg p-5 transition-colors hover:border-brand hover:bg-brand/5"
              >
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center font-mono text-sm font-bold text-muted-fg">
                  {isDone ? (
                    <CheckCircle2 className="size-5 text-success" />
                  ) : (
                    <Circle className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold group-hover:text-brand">
                    {idx + 1}. {topic.title}
                  </p>
                  {topic.description && (
                    <p className="mt-0.5 text-sm text-muted-fg">{topic.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-fg">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      ~{Math.ceil(qCount * 0.5)} min
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
