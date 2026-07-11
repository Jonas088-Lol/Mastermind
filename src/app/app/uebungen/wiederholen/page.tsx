import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { safeJsonParse } from "@/lib/safe-json";
import { RepeatClient, type RepeatQuestion } from "./RepeatClient";

export const metadata: Metadata = { title: "Fehler wiederholen" };

export default async function WiederholenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  // Letzte falsch beantwortete MC-Fragen (distinct pro Frage)
  const wrongAnswers = await prisma.exerciseAnswer.findMany({
    where: {
      userId: session.userId,
      correct: false,
      question: { type: "mc" },
    },
    select: {
      questionId: true,
      createdAt: true,
      question: {
        select: {
          id: true,
          question: true,
          options: true,
          correct: true,
          explanation: true,
          topic: { select: { subject: true, title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const seen = new Set<string>();
  const questions: RepeatQuestion[] = [];
  for (const a of wrongAnswers) {
    if (seen.has(a.questionId)) continue;
    seen.add(a.questionId);

    const options = safeJsonParse<string[]>(a.question.options, []);
    const correctIndex = parseInt(a.question.correct, 10);
    if (options.length < 2 || Number.isNaN(correctIndex) || !options[correctIndex]) continue;

    questions.push({
      id: a.question.id,
      question: a.question.question,
      options,
      correctIndex,
      explanation: a.question.explanation,
      subject: a.question.topic.subject,
      topicTitle: a.question.topic.title,
    });
    if (questions.length >= 20) break;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <Link href="/app/uebungen" className="text-sm text-brand hover:underline">
          ← Zurück zu den Übungen
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">🔁 Fehler wiederholen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Übe die Fragen, die du zuletzt falsch beantwortet hast — rein zum Lernen, ohne Bewertung.
        </p>
      </header>

      {questions.length === 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-4xl">🎉</p>
          <p className="mt-3 font-semibold">Keine Fehler zum Wiederholen</p>
          <p className="mt-1 text-sm text-muted-fg">
            Entweder hast du noch keine Multiple-Choice-Fragen falsch beantwortet — oder alles richtig gemacht.
          </p>
          <Link
            href="/app/uebungen"
            className="mt-4 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Zu den Übungen
          </Link>
        </section>
      ) : (
        <RepeatClient questions={questions} />
      )}
    </div>
  );
}
