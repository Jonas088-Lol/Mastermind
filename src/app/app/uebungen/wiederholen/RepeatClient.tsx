"use client";

import { useState } from "react";
import Link from "next/link";
import { rewardRepeatSession } from "./actions";

export type RepeatQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  subject: string;
  topicTitle: string;
};

export function RepeatClient({ questions }: { questions: RepeatQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [rewarded, setRewarded] = useState(false);

  const q = questions[index];
  const answered = selected !== null;

  function choose(i: number) {
    if (answered) return;
    setSelected(i);
    setResults((prev) => [...prev, i === q.correctIndex]);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setFinished(true);
      if (!rewarded) {
        setRewarded(true);
        rewardRepeatSession().catch(() => undefined);
      }
      return;
    }
    setIndex(index + 1);
    setSelected(null);
  }

  if (finished) {
    const correctCount = results.filter(Boolean).length;
    const quote = Math.round((correctCount / questions.length) * 100);
    return (
      <section className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-4xl">{quote >= 70 ? "🏆" : quote >= 40 ? "💪" : "📚"}</p>
        <h2 className="mt-3 text-2xl font-bold">Session beendet</h2>
        <p className="mt-1 text-sm text-muted-fg">
          {correctCount} von {questions.length} richtig — {quote}% Quote
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setSelected(null);
              setResults([]);
              setFinished(false);
            }}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Nochmal wiederholen
          </button>
          <Link
            href="/app/uebungen"
            className="rounded-xl border border-border bg-bg px-4 py-2 text-sm font-semibold"
          >
            Zurück zu den Übungen
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-fg">
        <span>
          Frage {index + 1} von {questions.length}
        </span>
        <span>
          {q.topicTitle}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${Math.round((index / questions.length) * 100)}%` }}
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-lg font-semibold">{q.question}</p>

        <div className="mt-4 flex flex-col gap-2">
          {q.options.map((opt, i) => {
            let cls = "border-border bg-bg hover:border-brand";
            if (answered) {
              if (i === q.correctIndex) cls = "border-emerald-500 bg-emerald-500/10";
              else if (i === selected) cls = "border-red-500 bg-red-500/10";
              else cls = "border-border bg-bg opacity-60";
            }
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => choose(i)}
                className={`rounded-xl border p-3 text-left text-sm transition-colors ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={`mt-4 rounded-xl border p-4 text-sm ${
              selected === q.correctIndex
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-red-500/40 bg-red-500/5"
            }`}
          >
            <p className="font-semibold">
              {selected === q.correctIndex ? "✅ Richtig!" : "❌ Leider falsch"}
            </p>
            {selected !== q.correctIndex && (
              <p className="mt-1 text-muted-fg">
                Richtige Antwort: <span className="font-medium text-fg">{q.options[q.correctIndex]}</span>
              </p>
            )}
            {q.explanation && <p className="mt-2 text-muted-fg">{q.explanation}</p>}
            <button
              type="button"
              onClick={next}
              className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              {index + 1 >= questions.length ? "Session beenden" : "Nächste Frage →"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
