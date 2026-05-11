import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { QuizEngine } from "./QuizEngine";
import { saveQuizResult } from "./actions";

interface PageParams {
  params: Promise<{ subject: string; grade: string; topicId: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { topicId } = await params;
  const topic = await prisma.exerciseTopic.findUnique({ where: { id: topicId }, select: { title: true } });
  return { title: topic ? `Quiz: ${topic.title}` : "Quiz" };
}

export default async function QuizPage({ params }: PageParams) {
  const { subject, grade: gradeStr, topicId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const grade = parseInt(gradeStr, 10);

  const topic = await prisma.exerciseTopic.findUnique({
    where: { id: topicId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!topic || topic.subject !== subject || topic.grade !== grade) notFound();
  if (topic.questions.length === 0) notFound();

  const backHref = `/app/uebungen/${subject}/${grade}/${topicId}`;

  async function handleComplete(score: number) {
    "use server";
    await saveQuizResult(topicId, score);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={backHref} className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Quiz</p>
          <h1 className="mt-0.5 text-lg font-bold">{topic.title}</h1>
        </div>
      </div>

      <QuizEngine
        questions={topic.questions}
        topicId={topicId}
        subject={subject}
        grade={grade}
        topicTitle={topic.title}
        backHref={backHref}
        onComplete={handleComplete}
      />
    </div>
  );
}
