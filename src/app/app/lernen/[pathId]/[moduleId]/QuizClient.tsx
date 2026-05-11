"use client";

import { ArrowRight, CheckCircle2, Trophy, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { completeModule, submitAnswer } from "./actions";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct: string;
  explanation: string | null;
}

interface Props {
  pathId: string;
  moduleId: string;
  moduleTitle: string;
  questions: Question[];
}

export function QuizClient({ pathId, moduleId, moduleTitle, questions }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const q = questions[current];
  const correctIdx = parseInt(q?.correct ?? "0", 10);
  const progress = ((current) / questions.length) * 100;

  function handleSelect(idx: number) {
    if (answered) return;
    setSelected(idx);
  }

  function handleConfirm() {
    if (selected === null || answered) return;
    const isCorrect = selected === correctIdx;
    if (isCorrect) setScore((s) => s + 1);
    setAnswered(true);
    startTransition(async () => {
      await submitAnswer(q.id, String(selected), isCorrect);
    });
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      startTransition(async () => {
        await completeModule(pathId, moduleId);
        setDone(true);
      });
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="grid size-20 place-items-center bg-success/10 text-success">
          <Trophy className="size-10" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Modul abgeschlossen!</h2>
          <p className="mt-2 text-muted-fg">{moduleTitle}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="font-mono text-4xl font-bold text-success">{score}/{questions.length}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-fg">Richtig</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-4xl font-bold">{pct}%</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-fg">Trefferquote</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/app/lernen/${pathId}`)} className="mt-4">
          Zurück zum Lernpfad
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-fg">
          <span className="font-semibold uppercase tracking-wider">{moduleTitle}</span>
          <span className="font-mono">{current + 1} / {questions.length}</span>
        </div>
        <Progress value={progress} tone="brand" />
      </div>

      <div className="border border-border bg-bg p-6">
        <p className="text-lg font-semibold leading-snug">{q.question}</p>
      </div>

      <div className="grid gap-3">
        {q.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrect = idx === correctIdx;
          let variant: "default" | "success" | "danger" = "default";
          if (answered) {
            if (isCorrect) variant = "success";
            else if (isSelected && !isCorrect) variant = "danger";
          }
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(idx)}
              disabled={answered}
              className={cn(
                "flex w-full items-center gap-4 border px-5 py-4 text-left text-sm font-medium transition-colors",
                !answered && !isSelected && "border-border bg-bg hover:border-brand hover:bg-surface",
                !answered && isSelected && "border-brand bg-brand/[0.08]",
                answered && variant === "success" && "border-success bg-success/10 text-success",
                answered && variant === "danger" && "border-danger bg-danger/10 text-danger",
                answered && !isSelected && variant === "default" && "border-border bg-bg opacity-50",
              )}
            >
              <span className={cn(
                "grid size-7 shrink-0 place-items-center border font-mono text-xs",
                !answered && isSelected ? "border-brand bg-brand text-bg" : "border-border",
                answered && variant === "success" && "border-success bg-success text-bg",
                answered && variant === "danger" && "border-danger bg-danger text-bg",
              )}>
                {answered && variant === "success" ? (
                  <CheckCircle2 className="size-4" />
                ) : answered && variant === "danger" ? (
                  <XCircle className="size-4" />
                ) : (
                  String.fromCharCode(65 + idx)
                )}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered && q.explanation && (
        <div className="border border-border-strong bg-surface px-5 py-4 text-sm text-muted-fg">
          <span className="font-semibold text-fg">Erklärung: </span>
          {q.explanation}
        </div>
      )}

      <div className="flex justify-end">
        {!answered ? (
          <Button
            onClick={handleConfirm}
            disabled={selected === null || isPending}
          >
            Antwort prüfen
            <ArrowRight className="size-3.5" />
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={isPending}>
            {current + 1 >= questions.length ? "Abschließen" : "Nächste Frage"}
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
