"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  type: string;
  options: string[];
  correct: string;
  explanation: string | null;
  order: number;
}

interface Props {
  questions: Question[];
  handleComplete: (score: number) => Promise<void>;
}

export function DuelQuizClient({ questions, handleComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const q = questions[idx];
  if (!q) return null;

  const isCorrect = selected === q.correct;
  const progress = Math.round((idx / questions.length) * 100);

  function check() {
    if (!selected) return;
    setChecked(true);
    if (selected === q.correct) setScore((s) => s + 1);
  }

  async function next() {
    setSelected(null);
    setChecked(false);
    if (idx + 1 >= questions.length) {
      setSubmitting(true);
      const finalScore = score + (selected === q.correct ? 0 : 0); // already counted
      await handleComplete(finalScore);
    } else {
      setIdx((i) => i + 1);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-border">
          <div className="h-1.5 bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="font-mono text-xs text-muted-fg">{idx + 1}/{questions.length}</span>
        <span className="font-mono text-xs font-bold text-success">+{score}</span>
      </div>

      {/* Question */}
      <div className="border border-border p-5">
        <p className="text-base font-semibold leading-snug">{q.question}</p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => {
          const isSelected = selected === String(i);
          const isRight = String(i) === q.correct;
          return (
            <button
              key={i}
              type="button"
              disabled={checked}
              onClick={() => !checked && setSelected(String(i))}
              className={cn(
                "w-full border px-4 py-3 text-left text-sm font-medium transition-colors",
                checked && isRight && "border-success bg-success/10 text-success",
                checked && isSelected && !isRight && "border-danger bg-danger/10 text-danger",
                !checked && isSelected && "border-brand bg-brand/10",
                !checked && !isSelected && "border-border hover:border-fg/30",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {checked && q.explanation && (
        <div className="border border-border bg-surface px-4 py-3 text-sm text-muted-fg">
          {q.explanation}
        </div>
      )}

      {/* Action */}
      {!checked ? (
        <button
          type="button"
          disabled={!selected}
          onClick={check}
          className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-40 hover:bg-fg/90"
        >
          Antworten
        </button>
      ) : (
        <button
          type="button"
          disabled={submitting}
          onClick={next}
          className={cn(
            "px-5 py-2.5 text-sm font-semibold",
            idx + 1 >= questions.length
              ? "bg-success text-white hover:bg-success/90"
              : "bg-fg text-bg hover:bg-fg/90"
          )}
        >
          {submitting
            ? "Wird gespeichert…"
            : idx + 1 >= questions.length
            ? "Duell abschließen"
            : "Weiter"}
        </button>
      )}
    </div>
  );
}
