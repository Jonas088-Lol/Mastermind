/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2, XCircle, ArrowRight, Trophy, RotateCcw, Timer, Zap, Lightbulb,
  Circle, Square, Triangle, Diamond, Lock, ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { native } from "@/lib/native";
import { safeJsonParse } from "@/lib/safe-json";
import { spendHintToken } from "./actions";

/**
 * Antwort-Symbole für Multiple-Choice / Blitz (In-App-Symboldesign) — je Option
 * eine unverwechselbare Form + Farbe statt A/B/C/D.
 */
const MC_SHAPES: { icon: LucideIcon; color: string }[] = [
  { icon: Circle,   color: "text-rose-500 bg-rose-500/10" },
  { icon: Square,   color: "text-sky-500 bg-sky-500/10" },
  { icon: Triangle, color: "text-amber-500 bg-amber-500/10" },
  { icon: Diamond,  color: "text-emerald-500 bg-emerald-500/10" },
];

export interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  options: string | null;
  correct: string;
  explanation: string | null;
  order: number;
}

interface QuizEngineProps {
  questions: QuizQuestion[];
  topicId: string;
  subject: string;
  grade: number;
  topicTitle: string;
  backHref: string;
  xpPerQuiz: number;
  comboEnabled?: boolean;
  comboMasterEnabled?: boolean;
  hintTokens?: number;
  onComplete: (score: number, maxCombo?: number) => Promise<void>;
}

type AnswerState = "pending" | "correct" | "wrong";

export function QuizEngine({
  questions,
  topicTitle,
  backHref,
  xpPerQuiz,
  comboEnabled = false,
  comboMasterEnabled = false,
  hintTokens = 0,
  onComplete,
}: QuizEngineProps) {
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<string>("");
  const [answerState, setAnswerState] = useState<AnswerState>("pending");
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintBalance, setHintBalance] = useState(hintTokens);
  const [hintPending, setHintPending] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Blitz timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const question = questions[idx];
  const isBlitz = question?.type === "blitz";

  useEffect(() => {
    // answerState MUSS in den Deps sein: sonst läuft das Intervall nach dem
    // Beantworten weiter und feuert bei 0 ein stale handleSubmit (Closure mit
    // answerState "pending") — die Frage würde doppelt in results gezählt.
    if (!isBlitz || answerState !== "pending") return;
    setTimeLeft(10);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          clearInterval(interval);
          handleSubmit("__timeout__");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, isBlitz, answerState]);

  const handleSubmit = useCallback(
    (userAnswer: string) => {
      if (answerState !== "pending") return;
      const correct = checkAnswer(question, userAnswer);
      setAnswerState(correct ? "correct" : "wrong");
      setResults((prev) => [...prev, correct]);
      if (comboEnabled) {
        if (correct) {
          setCombo((c) => {
            const next = c + 1;
            setMaxCombo((m) => Math.max(m, next));
            return next;
          });
        } else {
          setCombo(0);
        }
      }
      if (correct) {
        native.haptics.notification("Success").catch(() => {});
      } else {
        native.haptics.notification("Error").catch(() => {});
      }
    },
    [answerState, question, comboEnabled]
  );

  // Keyboard shortcuts: 1/2/3/4 for MC, T/F for true_false, Enter to advance
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (answerState !== "pending") {
        if (e.key === "Enter" || e.key === " ") handleNext();
        return;
      }
      if (question.type === "mc" || question.type === "blitz") {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) {
          const opts = safeJsonParse<string[]>(question.options, []);
          if (opts[n - 1]) handleSubmit(String(n - 1));
        }
      }
      if (question.type === "true_false") {
        if (e.key === "t" || e.key === "T" || e.key === "1") handleSubmit("true");
        if (e.key === "f" || e.key === "F" || e.key === "2") handleSubmit("false");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerState, question, idx]);

  const handleHint = useCallback(async () => {
    if (hintUsed || hintPending || hintBalance < 1) return;
    setHintPending(true);
    try {
      const remaining = await spendHintToken();
      if (remaining !== null) {
        setHintBalance(remaining);
        setHintUsed(true);
      }
    } finally {
      setHintPending(false);
    }
  }, [hintUsed, hintPending, hintBalance]);

  const handleNext = useCallback(async () => {
    // Guard: handleNext hängt auch am globalen Enter-Listener — ohne Guard
    // würde jedes Enter auf dem Ergebnisbildschirm (oder während des
    // Speicherns) onComplete und damit die XP-Vergabe erneut auslösen.
    if (saving || done) return;
    if (idx + 1 >= questions.length) {
      const score = Math.round((results.filter(Boolean).length / questions.length) * 100);
      setSaving(true);
      await onComplete(score, comboEnabled ? maxCombo : undefined);
      setSaving(false);
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setAnswer("");
    setAnswerState("pending");
    setTimeLeft(null);
    setHintUsed(false);
  }, [idx, questions.length, results, onComplete, comboEnabled, maxCombo, saving, done]);

  if (done) {
    const correctCount = results.filter(Boolean).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const xpEarned = Math.round(xpPerQuiz * (score / 100));
    const comboBonus = comboEnabled && maxCombo >= 3
      ? (comboMasterEnabled ? maxCombo * 30 : maxCombo * 15)
      : 0;
    return (
      <ResultScreen
        score={score}
        correct={correctCount}
        total={questions.length}
        xpEarned={xpEarned}
        comboBonus={comboBonus}
        maxCombo={comboEnabled ? maxCombo : 0}
        results={results}
        backHref={backHref}
        onRetry={() => {
          setIdx(0);
          setAnswer("");
          setAnswerState("pending");
          setResults([]);
          setDone(false);
          setTimeLeft(null);
          setCombo(0);
          setMaxCombo(0);
        }}
      />
    );
  }

  // Progress: how many answered out of total
  const answeredCount = idx + (answerState !== "pending" ? 1 : 0);
  const progressPct = (answeredCount / questions.length) * 100;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-fg">
          <span className="font-semibold">
            Frage {idx + 1} von {questions.length}
          </span>
          <div className="flex items-center gap-3">
            {comboEnabled && combo >= 2 && (
              <span className="flex items-center gap-1 font-bold text-orange-400 animate-pulse">
                🔥 {combo}×
              </span>
            )}
            {isBlitz && timeLeft !== null && (
              <span
                className={cn(
                  "flex items-center gap-1 font-mono font-bold",
                  timeLeft <= 3 ? "text-danger" : "text-muted-fg"
                )}
              >
                <Timer className="size-3.5" />
                {timeLeft}s
              </span>
            )}
            <span>{topicTitle}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden bg-surface-2">
          <div
            className="h-full bg-brand transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Per-question dots */}
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1",
                i < results.length
                  ? results[i]
                    ? "bg-success"
                    : "bg-danger"
                  : i === idx
                  ? "bg-brand/40"
                  : "bg-surface-2"
              )}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="border border-border bg-bg">
        <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
            {TYPE_LABEL[question.type] ?? question.type}
          </span>
          <div className="flex items-center gap-3">
            {(question.type === "mc" || question.type === "true_false") && answerState === "pending" && (
              <span className="hidden text-[10px] text-muted-fg sm:block">
                {question.type === "mc" ? "Tasten 1 – 4" : "T = Wahr · F = Falsch"}
              </span>
            )}
            {question.type === "blitz" && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
                Zeitlimit!
              </span>
            )}
          </div>
        </div>
        <div className="p-5">
          <p className="text-base font-semibold leading-relaxed">{question.question}</p>
        </div>
        {/* Tipp — muss im Shop gekauft werden und wird pro Aufdeckung verbraucht */}
        {answerState === "pending" && question.explanation && !hintUsed && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-2.5">
            {hintBalance >= 1 ? (
              <button
                type="button"
                onClick={handleHint}
                disabled={hintPending}
                className="flex items-center gap-2 text-xs font-medium text-muted-fg transition-colors hover:text-amber-500 disabled:opacity-50"
              >
                <span className="grid size-6 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Lightbulb className="size-3.5" strokeWidth={2} />
                </span>
                {hintPending ? "Wird aufgedeckt…" : "Tipp anzeigen"}
              </button>
            ) : (
              <span className="flex items-center gap-2 text-xs text-muted-fg">
                <span className="grid size-6 place-items-center rounded-lg bg-surface-2 text-muted-fg">
                  <Lock className="size-3.5" strokeWidth={2} />
                </span>
                Keine Tipps übrig
              </span>
            )}
            {hintBalance >= 1 ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                <Lightbulb className="size-3 text-amber-500" strokeWidth={2} />
                {hintBalance} übrig
              </span>
            ) : (
              <Link
                href="/app/shop"
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand hover:underline"
              >
                <ShoppingCart className="size-3" strokeWidth={2} />
                Im Shop kaufen
              </Link>
            )}
          </div>
        )}
        {hintUsed && question.explanation && answerState === "pending" && (
          <div className="flex items-start gap-2 border-t border-amber-500/20 bg-amber-500/5 px-5 py-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
              <Lightbulb className="size-3.5" strokeWidth={2} />
            </span>
            <p className="text-xs text-muted-fg">{question.explanation}</p>
          </div>
        )}
      </div>

      {/* Answer area */}
      <div>
        {answerState === "pending" ? (
          <AnswerInput
            question={question}
            answer={answer}
            setAnswer={setAnswer}
            onSubmit={handleSubmit}
          />
        ) : (
          <FeedbackArea
            correct={answerState === "correct"}
            explanation={question.explanation}
            correctAnswer={question.correct}
            question={question}
          />
        )}
      </div>

      {/* Next / submit button */}
      {answerState !== "pending" && (
        <button
          onClick={handleNext}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-fg py-3 text-sm font-semibold text-bg hover:bg-fg/90 disabled:opacity-50"
        >
          {idx + 1 >= questions.length ? (
            saving ? "Speichere…" : "Ergebnis anzeigen"
          ) : (
            <>
              Weiter <ArrowRight className="size-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Answer Input ────────────────────────────────────────────────────────────

function AnswerInput({
  question,
  answer,
  setAnswer,
  onSubmit,
}: {
  question: QuizQuestion;
  answer: string;
  setAnswer: (v: string) => void;
  onSubmit: (v: string) => void;
}) {
  const { type, options: optionsJson } = question;
  const options = optionsJson
    ? safeJsonParse<string[] | { left: string[]; right: string[] }>(optionsJson, [])
    : null;

  if (type === "mc" || type === "blitz") {
    const opts = options as string[];
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((opt, i) => {
          const shape = MC_SHAPES[i % MC_SHAPES.length];
          return (
            <button
              key={i}
              onClick={() => onSubmit(String(i))}
              className="flex items-center gap-3 rounded-2xl border border-border bg-bg px-4 py-3 text-left text-sm font-medium transition-colors hover:border-brand hover:bg-brand/5"
            >
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", shape.color)}>
                <shape.icon className="size-4" strokeWidth={2.25} />
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "true_false") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {(["Wahr", "Falsch"] as const).map((label) => (
          <button
            key={label}
            onClick={() => onSubmit(label === "Wahr" ? "true" : "false")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-bg py-5 text-center text-sm font-bold transition-colors hover:border-brand hover:bg-brand/5"
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  if (type === "fill_blank") {
    const correctArr = safeJsonParse<string[]>(question.correct, []);
    const blanks = correctArr.length;
    const [values, setValues] = useState<string[]>(Array(blanks).fill(""));

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(JSON.stringify(values));
        }}
        className="flex flex-col gap-4"
      >
        {blanks === 1 ? (
          <input
            autoFocus
            type="text"
            value={values[0]}
            onChange={(e) => setValues([e.target.value])}
            placeholder="Antwort eingeben…"
            className="border border-border bg-bg px-4 py-3 text-sm focus:border-brand focus:outline-none"
          />
        ) : (
          <div className="space-y-2">
            {values.map((v, i) => (
              <input
                key={i}
                autoFocus={i === 0}
                type="text"
                value={v}
                onChange={(e) =>
                  setValues((prev) => {
                    const next = [...prev];
                    next[i] = e.target.value;
                    return next;
                  })
                }
                placeholder={`Lücke ${i + 1}…`}
                className="w-full border border-border bg-bg px-4 py-3 text-sm focus:border-brand focus:outline-none"
              />
            ))}
          </div>
        )}
        <button
          type="submit"
          className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
        >
          Prüfen
        </button>
      </form>
    );
  }

  if (type === "order") {
    const opts = options as string[];
    const [order, setOrder] = useState<number[]>(opts.map((_, i) => i));

    function move(from: number, to: number) {
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    }

    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-fg">
          Verschiebe die Elemente in die richtige Reihenfolge.
        </p>
        <ol className="space-y-2">
          {order.map((origIdx, pos) => (
            <li
              key={origIdx}
              className="flex items-center gap-3 border border-border bg-bg px-4 py-3 text-sm"
            >
              <span className="font-mono text-xs font-bold text-muted-fg">{pos + 1}.</span>
              <span className="flex-1">{opts[origIdx]}</span>
              <div className="flex gap-1">
                {pos > 0 && (
                  <button
                    onClick={() => move(pos, pos - 1)}
                    className="size-6 border border-border text-xs text-muted-fg hover:border-brand"
                  >
                    ↑
                  </button>
                )}
                {pos < order.length - 1 && (
                  <button
                    onClick={() => move(pos, pos + 1)}
                    className="size-6 border border-border text-xs text-muted-fg hover:border-brand"
                  >
                    ↓
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        <button
          onClick={() => onSubmit(JSON.stringify(order))}
          className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
        >
          Prüfen
        </button>
      </div>
    );
  }

  if (type === "match") {
    const opts = options as { left: string[]; right: string[] };
    const [pairs, setPairs] = useState<(number | null)[]>(
      Array(opts.left.length).fill(null)
    );
    const [activeLeft, setActiveLeft] = useState<number | null>(null);

    function handleLeftClick(i: number) {
      setActiveLeft(i === activeLeft ? null : i);
    }

    function handleRightClick(j: number) {
      if (activeLeft === null) return;
      setPairs((prev) => {
        const next = [...prev];
        const existing = next.indexOf(j);
        if (existing !== -1) next[existing] = null;
        next[activeLeft] = j;
        return next;
      });
      setActiveLeft(null);
    }

    const allPaired = pairs.every((p) => p !== null);

    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-fg">
          Klicke zuerst einen Begriff links, dann die passende Erklärung rechts.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            {opts.left.map((item, i) => (
              <button
                key={i}
                onClick={() => handleLeftClick(i)}
                className={cn(
                  "w-full border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  activeLeft === i
                    ? "border-brand bg-brand/10"
                    : pairs[i] !== null
                    ? "border-success/50 bg-success/5"
                    : "border-border bg-bg hover:border-brand"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {opts.right.map((item, j) => {
              const matched = pairs.indexOf(j);
              return (
                <button
                  key={j}
                  onClick={() => handleRightClick(j)}
                  className={cn(
                    "w-full border px-3 py-2.5 text-left text-sm transition-colors",
                    matched !== -1
                      ? "border-success/50 bg-success/5 font-medium"
                      : activeLeft !== null
                      ? "border-border bg-bg hover:border-brand"
                      : "border-border bg-bg text-muted-fg"
                  )}
                >
                  {matched !== -1 && (
                    <span className="mr-1.5 text-xs text-muted-fg">{matched + 1}→</span>
                  )}
                  {item}
                </button>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => onSubmit(JSON.stringify(pairs))}
          disabled={!allPaired}
          className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90 disabled:opacity-40"
        >
          Prüfen
        </button>
      </div>
    );
  }

  return <p className="text-sm text-muted-fg">Unbekannter Fragetyp: {type}</p>;
}

// ─── Feedback ───────────────────────────────────────────────────────────────

function FeedbackArea({
  correct,
  explanation,
  correctAnswer,
  question,
}: {
  correct: boolean;
  explanation: string | null;
  correctAnswer: string;
  question: QuizQuestion;
}) {
  const opts = question.options
    ? safeJsonParse<string[] | { left: string[]; right: string[] }>(question.options, [])
    : null;

  let correctLabel = "";
  if (question.type === "mc" || question.type === "blitz") {
    const i = parseInt(correctAnswer, 10);
    correctLabel = (opts as string[])?.[i] ?? correctAnswer;
  } else if (question.type === "true_false") {
    correctLabel = correctAnswer === "true" ? "Wahr" : "Falsch";
  } else if (question.type === "fill_blank") {
    correctLabel = safeJsonParse<string[]>(correctAnswer, []).join(", ");
  }

  return (
    <div
      className={cn(
        "border p-5",
        correct ? "border-success/40 bg-success/5" : "border-danger/40 bg-danger/5"
      )}
    >
      <div className="flex items-start gap-3">
        {correct ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        ) : (
          <XCircle className="mt-0.5 size-5 shrink-0 text-danger" />
        )}
        <div className="space-y-1.5">
          <p className={cn("font-semibold", correct ? "text-success" : "text-danger")}>
            {correct ? "Richtig!" : "Falsch"}
          </p>
          {!correct && correctLabel && (
            <p className="text-sm">
              <span className="text-muted-fg">Richtige Antwort: </span>
              <span className="font-semibold">{correctLabel}</span>
            </p>
          )}
          {explanation && <p className="text-sm text-muted-fg">{explanation}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Result screen ───────────────────────────────────────────────────────────

function ResultScreen({
  score,
  correct,
  total,
  xpEarned,
  comboBonus,
  maxCombo,
  results,
  backHref,
  onRetry,
}: {
  score: number;
  correct: number;
  total: number;
  xpEarned: number;
  comboBonus: number;
  maxCombo: number;
  results: boolean[];
  backHref: string;
  onRetry: () => void;
}) {
  const great = score >= 80;
  const ok = score >= 50;
  const wrong = total - correct;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      {/* Trophy + score */}
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div
          className={cn(
            "flex size-20 items-center justify-center border-2",
            great
              ? "border-success text-success"
              : ok
              ? "border-warning text-warning"
              : "border-danger text-danger"
          )}
        >
          <Trophy className="size-9" strokeWidth={1.5} />
        </div>

        <div>
          <p className="text-5xl font-black tracking-tight">{score}%</p>
          <p className="mt-1 text-sm text-muted-fg">
            {correct} von {total} Fragen richtig
          </p>
        </div>

        <p className="text-sm font-medium text-muted-fg">
          {great
            ? "Ausgezeichnet! Du hast das Thema verstanden."
            : ok
            ? "Gut gemacht! Noch ein bisschen Übung fehlt."
            : "Nicht aufgeben — probier es nochmal!"}
        </p>
      </div>

      {/* Stats cards */}
      <div className={cn("grid gap-3", comboBonus > 0 ? "grid-cols-2" : "grid-cols-3")}>
        <div className="flex flex-col items-center gap-1 border border-success/30 bg-success/4 p-4 text-center">
          <CheckCircle2 className="size-5 text-success" />
          <span className="text-2xl font-black text-success">{correct}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
            Richtig
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 border border-danger/30 bg-danger/4 p-4 text-center">
          <XCircle className="size-5 text-danger" />
          <span className="text-2xl font-black text-danger">{wrong}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
            Falsch
          </span>
        </div>
        {comboBonus > 0 ? (
          <>
            <div className="flex flex-col items-center gap-1 border border-orange-400/30 bg-orange-400/4 p-4 text-center">
              <span className="text-lg">🔥</span>
              <span className="text-2xl font-black text-orange-400">{maxCombo}×</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                Best Combo
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 border border-brand/30 bg-brand/4 p-4 text-center">
              <Zap className="size-5 text-brand" />
              <span className="text-2xl font-black text-brand">+{xpEarned + comboBonus}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                XP <span className="text-orange-400">(+{comboBonus} Combo)</span>
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 border border-brand/30 bg-brand/4 p-4 text-center">
            <Zap className="size-5 text-brand" />
            <span className="text-2xl font-black text-brand">+{xpEarned}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
              XP
            </span>
          </div>
        )}
      </div>

      {/* Per-question result strip */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
          Fragen im Überblick
        </p>
        <div className="flex gap-1">
          {results.map((r, i) => (
            <div
              key={i}
              title={`Frage ${i + 1}: ${r ? "Richtig" : "Falsch"}`}
              className={cn(
                "flex h-7 flex-1 items-center justify-center text-[10px] font-bold text-white",
                r ? "bg-success" : "bg-danger"
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-2 border border-border bg-bg py-3 text-sm font-semibold hover:bg-surface"
        >
          <RotateCcw className="size-3.5" />
          Nochmal
        </button>
        <a
          href={backHref}
          className="flex flex-1 items-center justify-center gap-2 bg-fg py-3 text-sm font-semibold text-bg hover:bg-fg/90"
        >
          Zurück
        </a>
      </div>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function checkAnswer(question: QuizQuestion, userAnswer: string): boolean {
  const { type, correct } = question;

  if (userAnswer === "__timeout__") return false;

  if (type === "mc" || type === "blitz" || type === "true_false") {
    return userAnswer === correct;
  }

  if (type === "fill_blank") {
    const correctArr = safeJsonParse<string[]>(correct, []);
    const userArr = safeJsonParse<string[]>(userAnswer, []);
    return correctArr.length > 0 && correctArr.every(
      (c, i) => (userArr[i] ?? "").trim().toLowerCase() === c.trim().toLowerCase()
    );
  }

  if (type === "order") {
    const correctOrder = safeJsonParse<number[]>(correct, []);
    const userOrder = safeJsonParse<number[]>(userAnswer, []);
    return correctOrder.length > 0 && JSON.stringify(userOrder) === JSON.stringify(correctOrder);
  }

  if (type === "match") {
    const correctPairs = safeJsonParse<number[]>(correct, []);
    const userPairs = safeJsonParse<(number | null)[]>(userAnswer, []);
    return correctPairs.length > 0 && correctPairs.every((c, i) => userPairs[i] === c);
  }

  return false;
}

const TYPE_LABEL: Record<string, string> = {
  mc: "Multiple Choice",
  blitz: "Blitzrunde",
  fill_blank: "Lückentext",
  true_false: "Wahr / Falsch",
  order: "Reihenfolge",
  match: "Zuordnung",
};
