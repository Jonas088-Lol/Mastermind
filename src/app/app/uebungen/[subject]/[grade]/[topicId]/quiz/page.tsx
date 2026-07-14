/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { XP_REWARDS } from "@/lib/xp";
import { EXERCISE_BLOCK_SIZE } from "@/lib/exercise-visuals";
import { QuizEngine } from "./QuizEngine";
import { saveQuizResult } from "./actions";

interface PageParams {
  params: Promise<{ subject: string; grade: string; topicId: string }>;
  searchParams: Promise<{ block?: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { topicId } = await params;
  const topic = await prisma.exerciseTopic.findUnique({ where: { id: topicId }, select: { title: true } });
  return { title: topic ? `Quiz: ${topic.title}` : "Quiz" };
}

export default async function QuizPage({ params, searchParams }: PageParams) {
  const { subject, grade: gradeStr, topicId } = await params;
  const { block: blockStr } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const grade = parseInt(gradeStr, 10);

  const [topic, purchases] = await Promise.all([
    prisma.exerciseTopic.findUnique({
      where: { id: topicId },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.userSkillPurchase.findMany({
      where: { userId: session.userId },
      select: { nodeKey: true },
    }),
  ]);

  if (!topic || topic.subject !== subject || topic.grade !== grade) notFound();
  if (topic.questions.length === 0) notFound();

  // Kurze Übung: nur einen Block (max. EXERCISE_BLOCK_SIZE Fragen) spielen.
  const totalBlocks = Math.max(1, Math.ceil(topic.questions.length / EXERCISE_BLOCK_SIZE));
  const blockIdx = Math.min(Math.max(0, parseInt(blockStr ?? "0", 10) || 0), totalBlocks - 1);
  const blockQuestions = topic.questions.slice(
    blockIdx * EXERCISE_BLOCK_SIZE,
    blockIdx * EXERCISE_BLOCK_SIZE + EXERCISE_BLOCK_SIZE,
  );
  const blockLabel = totalBlocks > 1 ? `${topic.title} · Block ${blockIdx + 1}` : topic.title;

  const purchasedSet = new Set(purchases.map((p) => p.nodeKey));
  const comboEnabled       = purchasedSet.has("feat_combo");
  const comboMasterEnabled = purchasedSet.has("feat_combo_master");

  const backHref = `/app/uebungen/${subject}/${grade}/${topicId}`;

  async function handleComplete(score: number, maxCombo?: number) {
    "use server";
    await saveQuizResult(topicId, score, comboEnabled ? maxCombo : undefined);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={backHref} className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Quiz</p>
          <h1 className="mt-0.5 text-lg font-bold">{blockLabel}</h1>
        </div>
      </div>

      <QuizEngine
        questions={blockQuestions}
        topicId={topicId}
        subject={subject}
        grade={grade}
        topicTitle={blockLabel}
        backHref={backHref}
        xpPerQuiz={XP_REWARDS.quiz_completed}
        comboEnabled={comboEnabled}
        comboMasterEnabled={comboMasterEnabled}
        onComplete={handleComplete}
      />
    </div>
  );
}
