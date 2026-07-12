/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { QuizClient } from "./QuizClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pathId: string; moduleId: string }>;
}): Promise<Metadata> {
  const { moduleId } = await params;
  const m = await prisma.learningModule.findUnique({
    where: { id: moduleId },
    select: { title: true },
  });
  return { title: m?.title ?? "Modul" };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ pathId: string; moduleId: string }>;
}) {
  const { pathId, moduleId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const learningModule = await prisma.learningModule.findUnique({
    where: { id: moduleId },
    include: {
      questions: { orderBy: { order: "asc" } },
      path: { select: { id: true, title: true } },
    },
  });

  if (!learningModule || learningModule.path.id !== pathId) notFound();
  if (learningModule.questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-muted-fg">
        Dieses Modul enthält noch keine Fragen.
      </div>
    );
  }

  const questions = learningModule.questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: JSON.parse(q.options) as string[],
    correct: q.correct,
    explanation: q.explanation,
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/app/lernen/${pathId}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-3.5" />
          {learningModule.path.title}
        </Link>
      </div>

      <QuizClient
        pathId={pathId}
        moduleId={moduleId}
        moduleTitle={learningModule.title}
        questions={questions}
      />
    </div>
  );
}
