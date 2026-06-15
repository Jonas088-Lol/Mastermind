import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { DuelQuizClient } from "./DuelQuizClient";
import { submitDuelScore } from "../actions";

interface PageParams { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const duel = await prisma.duel.findUnique({ where: { id }, include: { topic: { select: { title: true } } } });
  return { title: `Duell: ${duel?.topic.title ?? "Quiz"}` };
}

export default async function DuelPage({ params }: PageParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const duel = await prisma.duel.findUnique({
    where: { id },
    include: {
      challenger: { select: { id: true, name: true } },
      challenged: { select: { id: true, name: true } },
      topic: {
        include: {
          questions: {
            include: { answers: { where: { userId: session.userId } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!duel) notFound();

  const isParticipant = duel.challengerId === session.userId || duel.challengedId === session.userId;
  if (!isParticipant) redirect("/app/duelle");

  const isChallenger = duel.challengerId === session.userId;
  const opponent = isChallenger ? duel.challenged : duel.challenger;
  const myScore = isChallenger ? duel.challengerScore : duel.challengedScore;
  const oppScore = isChallenger ? duel.challengedScore : duel.challengerScore;

  // Completed view
  if (duel.status === "completed") {
    const won = duel.winnerId === session.userId;
    const draw = duel.winnerId === null;
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-8">
        <Link href="/app/duelle" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" /> Alle Duelle
        </Link>
        <div className="rounded-2xl border border-border p-8 text-center">
          <p className="text-5xl">{won ? "🏆" : draw ? "🤝" : "😤"}</p>
          <h1 className="mt-4 text-2xl font-bold">{won ? "Gewonnen!" : draw ? "Unentschieden!" : "Verloren!"}</h1>
          <p className="mt-2 text-muted-fg">{duel.topic.title}</p>
          <div className="mt-6 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-xs text-muted-fg">Du</p>
              <p className="font-mono text-4xl font-bold">{myScore ?? "—"}</p>
            </div>
            <p className="text-2xl font-bold text-muted-fg">:</p>
            <div className="text-center">
              <p className="text-xs text-muted-fg">{opponent.name}</p>
              <p className="font-mono text-4xl font-bold">{oppScore ?? "—"}</p>
            </div>
          </div>
        </div>
        <Link href="/app/duelle" className="text-center text-sm font-semibold text-brand hover:underline">
          Zurück zu Duellen
        </Link>
      </div>
    );
  }

  // Pending: not accepted yet
  if (duel.status === "pending") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <Link href="/app/duelle" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" /> Alle Duelle
        </Link>
        <div className="rounded-2xl border border-border p-8 text-center">
          <p className="text-3xl">⏳</p>
          <h1 className="mt-3 text-xl font-bold">Warte auf Antwort</h1>
          <p className="mt-2 text-sm text-muted-fg">{opponent.name} muss die Herausforderung noch annehmen.</p>
        </div>
      </div>
    );
  }

  // Already submitted my score
  if (myScore !== null) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <Link href="/app/duelle" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" /> Alle Duelle
        </Link>
        <div className="rounded-2xl border border-border p-8 text-center">
          <p className="text-3xl">✅</p>
          <h1 className="mt-3 text-xl font-bold">Quiz abgeschlossen</h1>
          <p className="mt-2 text-sm text-muted-fg">Dein Score: <strong>{myScore}</strong></p>
          <p className="mt-1 text-sm text-muted-fg">Warte auf {opponent.name}…</p>
        </div>
      </div>
    );
  }

  // Active: play the quiz
  const questions = duel.topic.questions.map((q) => ({
    id: q.id,
    question: q.question,
    type: q.type,
    options: q.options ? JSON.parse(q.options) as string[] : [],
    correct: q.correct,
    explanation: q.explanation ?? null,
    order: q.order,
  }));

  async function handleComplete(score: number) {
    "use server";
    await submitDuelScore(id, score);
    redirect(`/app/duelle/${id}`);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <Link href="/app/duelle" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg">
          <ArrowLeft className="size-3.5" /> Alle Duelle
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Duell: {duel.topic.title}</h1>
        <p className="mt-1 text-sm text-muted-fg">gegen {opponent.name} · {questions.length} Fragen</p>
      </header>

      <DuelQuizClient questions={questions} handleComplete={handleComplete} />
    </div>
  );
}
