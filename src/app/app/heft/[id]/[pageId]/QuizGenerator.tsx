"use client";

import { useState, useTransition } from "react";
import { Sparkles, X, CheckCircle2, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { generateQuizFromPage } from "./quizActions";

type QuizQ = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

interface Props {
  pageId: string;
  pageTitle: string;
}

export function QuizGenerator({ pageId, pageTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [quiz, setQuiz] = useState<QuizQ[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Quiz state
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  function generate() {
    setError(null);
    setQuiz(null);
    setIdx(0);
    setSelected(null);
    setCorrect(0);
    setDone(false);
    startTransition(async () => {
      const res = await generateQuizFromPage(pageId);
      if ("error" in res) setError(res.error);
      else setQuiz(res.questions);
    });
  }

  function pick(i: number) {
    if (selected !== null) return;
    setSelected(i);
    if (quiz && i === quiz[idx].correct) setCorrect(c => c + 1);
  }

  function next() {
    if (!quiz) return;
    if (idx + 1 >= quiz.length) {
      setDone(true);
    } else {
      setIdx(i => i + 1);
      setSelected(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); generate(); }}
        className="flex items-center gap-1.5 border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-brand hover:text-brand"
        title="KI-Quiz aus dieser Seite generieren"
      >
        <Sparkles className="size-3.5" strokeWidth={1.75} />
        Quiz generieren
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg border border-border bg-bg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
            <span className="font-semibold text-sm">KI-Quiz · {pageTitle}</span>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-muted-fg hover:text-fg">
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6">
          {/* Loading */}
          {pending && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="size-8 animate-spin text-brand" strokeWidth={1.5} />
              <p className="text-sm text-muted-fg">KI generiert Quiz aus deinen Notizen…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="space-y-4 text-center py-4">
              <p className="text-sm text-danger">{error}</p>
              <button type="button" onClick={generate} className="flex items-center gap-2 mx-auto border border-border px-4 py-2 text-sm hover:bg-surface">
                <RotateCcw className="size-3.5" /> Erneut versuchen
              </button>
            </div>
          )}

          {/* Result */}
          {done && quiz && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="text-5xl">{correct / quiz.length >= 0.8 ? "🏆" : correct / quiz.length >= 0.5 ? "🎯" : "💪"}</div>
              <p className="text-xl font-bold">{correct} / {quiz.length} richtig</p>
              <p className="text-sm text-muted-fg">{Math.round((correct / quiz.length) * 100)}% korrekt</p>
              <button type="button" onClick={generate} className="flex items-center gap-2 border border-border px-4 py-2 text-sm hover:bg-surface">
                <RotateCcw className="size-3.5" /> Neues Quiz
              </button>
            </div>
          )}

          {/* Quiz question */}
          {quiz && !done && quiz[idx] && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                  Frage {idx + 1} / {quiz.length}
                </p>
                <p className="text-base font-semibold">{quiz[idx].question}</p>
              </div>

              <div className="space-y-2">
                {quiz[idx].options.map((opt, i) => {
                  let cls = "w-full border-2 px-4 py-3 text-left text-sm font-medium transition-colors ";
                  if (selected === null) {
                    cls += "border-border hover:border-brand hover:bg-brand/5 cursor-pointer";
                  } else if (i === quiz[idx].correct) {
                    cls += "border-success bg-success/15 text-success";
                  } else if (i === selected) {
                    cls += "border-danger bg-danger/15 text-danger";
                  } else {
                    cls += "border-border opacity-50";
                  }
                  return (
                    <button key={i} type="button" className={cls} onClick={() => pick(i)}>
                      <span className="mr-2 font-mono text-muted-fg">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selected !== null && (
                <div className="space-y-3">
                  <div className={`flex items-start gap-2 text-sm ${selected === quiz[idx].correct ? "text-success" : "text-danger"}`}>
                    {selected === quiz[idx].correct
                      ? <CheckCircle2 className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                      : <XCircle className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} />}
                    <p>{quiz[idx].explanation}</p>
                  </div>
                  <button type="button" onClick={next} className="w-full bg-fg py-2.5 text-sm font-semibold text-bg hover:opacity-90">
                    {idx + 1 < quiz.length ? "Weiter" : "Ergebnis anzeigen"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
