/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { gradeSubmission } from "./GradingEngine";
import { TextToSpeech, useTextToSpeech } from "./TextToSpeech";
import { WorksheetTimer } from "./WorksheetTimer";
import { TextInputWidget } from "./widgets/TextInputWidget";
import { FillBlankWidget } from "./widgets/FillBlankWidget";
import { MultipleChoiceWidget } from "./widgets/MultipleChoiceWidget";
import { TrueFalseWidget } from "./widgets/TrueFalseWidget";
import { DragDropWidget } from "./widgets/DragDropWidget";
import { MatchingWidget } from "./widgets/MatchingWidget";
import { SortingWidget } from "./widgets/SortingWidget";
import { DrawingWidget } from "./widgets/DrawingWidget";
import { NumberWallWidget } from "./widgets/NumberWallWidget";
import { NumberLineWidget } from "./widgets/NumberLineWidget";
import { CalculationWheelWidget } from "./widgets/CalculationWheelWidget";
import { HundredChartWidget } from "./widgets/HundredChartWidget";

export interface WorksheetItemData {
  id: string;
  type: string;
  order: number;
  config: string;
  correctAnswer: string | null;
  hint: string | null;
  points: number;
  required: boolean;
}

export interface WorksheetData {
  id: string;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  difficulty: string;
  language: string;
  items: WorksheetItemData[];
  assignment?: {
    id: string;
    showHints: boolean;
    showSolution: boolean;
    dueAt: string | null;
    estimatedMinutes?: number;
  };
}

interface Props {
  worksheet: WorksheetData;
  existingSubmissionId?: string;
  existingAnswers?: Record<string, string>;
  onSubmit: (answers: Record<string, string>, timeTakenSec: number) => Promise<{ ok: boolean; score?: number; maxScore?: number }>;
  /**
   * Lädt die Musterlösungen (itemId → correctAnswer-JSON) für die Review-Ansicht
   * nach. Wird erst NACH der Abgabe aufgerufen, damit die Lösung nie im
   * Client-Payload steht, solange der Schüler bearbeitet.
   */
  onRequestSolutions?: () => Promise<Record<string, string>>;
  mode?: "student" | "preview";
  fontSize?: "sm" | "base" | "lg" | "xl";
  highContrast?: boolean;
}

type Phase = "playing" | "submitted" | "reviewing";

export function WorksheetPlayer({
  worksheet,
  existingAnswers,
  onSubmit,
  onRequestSolutions,
  mode = "student",
  fontSize = "base",
  highContrast = false,
}: Props) {
  const items = worksheet.items.sort((a, b) => a.order - b.order);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(existingAnswers ?? {});
  const [phase, setPhase] = useState<Phase>("playing");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null);
  const [gradeResults, setGradeResults] = useState<Map<string, { isCorrect: boolean | null; pointsEarned: number }>>(new Map());
  // Nach Abgabe nachgeladene Musterlösungen (itemId → correctAnswer-JSON). Im
  // Payload steht die Lösung nicht mehr, deshalb kommt sie hier für die Review-
  // Ansicht rein. Im Vorschau-Modus (Lehrer) bleibt sie leer und die Lösung
  // stammt direkt aus item.correctAnswer.
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [loadingReview, setLoadingReview] = useState(false);
  const [hintsShown, setHintsShown] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const startTime = useRef(Date.now());
  const { speak } = useTextToSpeech();

  const showHints = worksheet.assignment?.showHints !== false;
  const showSolution = worksheet.assignment?.showSolution === true;
  const hasTimer = (worksheet.assignment?.estimatedMinutes ?? worksheet.estimatedMinutes) > 0;

  const item = items[currentIndex];
  const totalItems = items.length;
  const answeredCount = items.filter((i) => answers[i.id] && answers[i.id] !== "{}").length;

  const setAnswer = useCallback((itemId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [itemId]: JSON.stringify(value) }));
  }, []);

  const getRawAnswer = useCallback((itemId: string): string => answers[itemId] ?? "", [answers]);

  const parseAnswer = useCallback(<T,>(itemId: string, fallback: T): T => {
    const raw = answers[itemId];
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }, [answers]);

  function toggleHint(itemId: string) {
    setHintsShown((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }

  async function handleSubmit() {
    if (mode === "preview") {
      const results = gradeSubmission(
        items.map((i) => ({ id: i.id, type: i.type, correctAnswer: solutions[i.id] ?? i.correctAnswer, points: i.points })),
        new Map(Object.entries(answers))
      );
      setGradeResults(results.itemResults);
      setResult({ score: results.totalScore, maxScore: results.maxScore });
      setPhase("reviewing");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const timeTaken = Math.floor((Date.now() - startTime.current) / 1000);
      const res = await onSubmit(answers, timeTaken);
      if (res.ok) {
        if (res.score !== undefined && res.maxScore !== undefined) {
          setResult({ score: res.score, maxScore: res.maxScore });
        }
        setPhase("submitted");
      } else {
        setError("Fehler beim Einreichen. Bitte erneut versuchen.");
      }
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview() {
    // Musterlösungen erst nach Abgabe vom Server holen (nicht im Payload).
    let sol = solutions;
    if (onRequestSolutions && Object.keys(sol).length === 0) {
      setLoadingReview(true);
      try {
        sol = await onRequestSolutions();
        setSolutions(sol);
      } catch {
        sol = solutions;
      } finally {
        setLoadingReview(false);
      }
    }
    const results = gradeSubmission(
      items.map((i) => ({ id: i.id, type: i.type, correctAnswer: sol[i.id] ?? i.correctAnswer, points: i.points })),
      new Map(Object.entries(answers))
    );
    setGradeResults(results.itemResults);
    setCurrentIndex(0);
    setPhase("reviewing");
  }

  // Save progress to localStorage for offline resilience
  useEffect(() => {
    if (phase === "playing") {
      try {
        localStorage.setItem(`ws-progress-${worksheet.id}`, JSON.stringify(answers));
      } catch {}
    }
  }, [answers, worksheet.id, phase]);

  // Load saved progress on mount
  useEffect(() => {
    if (!existingAnswers) {
      try {
        const saved = localStorage.getItem(`ws-progress-${worksheet.id}`);
        if (saved) setAnswers(JSON.parse(saved));
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fontClass = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  }[fontSize];

  const containerClass = highContrast
    ? "bg-black text-white"
    : "bg-bg text-fg";

  if (phase === "submitted") {
    return (
      <div className={`flex flex-col items-center gap-6 py-12 text-center ${containerClass}`}>
        <div className="grid size-20 place-items-center bg-success/10">
          <CheckCircle2 className="size-10 text-success" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Abgegeben!</h2>
          {result && (
            <p className="mt-2 text-muted-fg">
              Ergebnis: <span className="font-mono font-bold text-fg">{result.score}</span>
              {" / "}{result.maxScore} Punkte
              {" "}({result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0}%)
            </p>
          )}
        </div>
        {showSolution && (
          <button
            onClick={handleReview}
            disabled={loadingReview}
            className="inline-flex items-center gap-2 border border-border bg-bg px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface disabled:opacity-50"
          >
            <RotateCcw className="size-4" />
            {loadingReview ? "Wird geladen…" : "Lösung anzeigen"}
          </button>
        )}
      </div>
    );
  }

  if (!item) {
    return (
      <div className={`flex flex-col items-center gap-4 py-12 text-center ${containerClass}`}>
        <AlertCircle className="size-8 text-muted-fg" strokeWidth={1.5} />
        <p className="text-muted-fg">Dieses Arbeitsblatt enthält keine Aufgaben.</p>
      </div>
    );
  }

  const feedback = phase === "reviewing" ? gradeResults.get(item.id) : undefined;

  return (
    <div className={`flex min-h-[60vh] flex-col ${containerClass} ${fontClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
            {currentIndex + 1} / {totalItems}
          </p>
          <p className="mt-0.5 text-xs text-muted-fg">
            {answeredCount} beantwortet
          </p>
        </div>

        <div className="flex items-center gap-2">
          {phase === "reviewing" && feedback && (
            feedback.isCorrect === true
              ? <CheckCircle2 className="size-5 text-success" />
              : feedback.isCorrect === false
              ? <XCircle className="size-5 text-danger" />
              : <AlertCircle className="size-5 text-muted-fg" />
          )}
          {hasTimer && phase === "playing" && (
            <WorksheetTimer
              initialSeconds={(worksheet.assignment?.estimatedMinutes ?? worksheet.estimatedMinutes) * 60}
              autoStart
              className="text-xs"
            />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border">
        <div
          className="h-1 bg-brand transition-all"
          style={{ width: `${((currentIndex + 1) / totalItems) * 100}%` }}
        />
      </div>

      {/* Item */}
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6">
        {/* Item header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-fg">
              Aufgabe {currentIndex + 1}
            </span>
            {item.points > 1 && (
              <span className="font-mono text-[10px] text-muted-fg">· {item.points} Pkt.</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* TTS button */}
            {(() => {
              try {
                const cfg = JSON.parse(item.config);
                const text = cfg.question ?? cfg.label ?? cfg.task ?? cfg.instruction ?? "";
                return text ? (
                  <TextToSpeech
                    text={text}
                    lang={worksheet.language === "de" ? "de-DE" : worksheet.language}
                  />
                ) : null;
              } catch { return null; }
            })()}
            {/* Hint button */}
            {showHints && item.hint && phase === "playing" && (
              <button
                onClick={() => toggleHint(item.id)}
                className="grid size-7 place-items-center text-muted-fg transition-colors hover:text-warning"
                title="Hinweis anzeigen"
              >
                <HelpCircle className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Hint */}
        {hintsShown.has(item.id) && item.hint && (
          <div className="mb-4 flex items-start gap-2 border-l-2 border-warning bg-warning/6 px-3 py-2 text-sm text-muted-fg">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-warning" />
            {item.hint}
          </div>
        )}

        {/* Widget */}
        <WidgetRenderer
          key={item.id}
          item={item}
          correctAnswer={solutions[item.id] ?? item.correctAnswer}
          parseAnswer={parseAnswer}
          getRawAnswer={getRawAnswer}
          setAnswer={setAnswer}
          feedback={feedback ? { isCorrect: feedback.isCorrect, pointsEarned: feedback.pointsEarned } : undefined}
          readOnly={phase === "reviewing"}
          showSolution={showSolution}
          onSpeak={speak}
        />
      </div>

      {/* Footer navigation */}
      <div className="border-t border-border px-4 py-3">
        {error && (
          <p className="mb-3 text-center text-sm text-danger">{error}</p>
        )}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:text-fg disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
            Zurück
          </button>

          {/* Item dots */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {items.map((it, idx) => {
              const answered = Boolean(answers[it.id]);
              const isReviewing = phase === "reviewing";
              const itemResult = isReviewing ? gradeResults.get(it.id) : undefined;
              return (
                <button
                  key={it.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`size-2.5 rounded-full transition-colors ${
                    idx === currentIndex
                      ? "bg-brand ring-2 ring-brand ring-offset-2 ring-offset-bg"
                      : itemResult?.isCorrect === true
                      ? "bg-success"
                      : itemResult?.isCorrect === false
                      ? "bg-danger"
                      : answered
                      ? "bg-brand/40"
                      : "bg-border"
                  }`}
                  title={`Aufgabe ${idx + 1}`}
                />
              );
            })}
          </div>

          {currentIndex < totalItems - 1 ? (
            <button
              onClick={() => setCurrentIndex((i) => Math.min(totalItems - 1, i + 1))}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors hover:text-fg"
            >
              Weiter
              <ChevronRight className="size-4" />
            </button>
          ) : phase === "playing" ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-fg px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="size-4" />
              {submitting ? "Wird eingereicht…" : "Abgeben"}
            </button>
          ) : (
            <span className="px-3 py-2 text-sm text-muted-fg">Fertig</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Widget renderer ─────────────────────────────────────────── */

interface RendererProps {
  item: WorksheetItemData;
  /** Effektive Musterlösung (nach Abgabe nachgeladen) – nicht item.correctAnswer nutzen. */
  correctAnswer: string | null;
  parseAnswer: <T>(id: string, fallback: T) => T;
  getRawAnswer: (id: string) => string;
  setAnswer: (id: string, value: unknown) => void;
  feedback?: { isCorrect: boolean | null; pointsEarned: number };
  readOnly: boolean;
  showSolution: boolean;
  onSpeak: (text: string) => void;
}

function WidgetRenderer({ item, correctAnswer, parseAnswer, setAnswer, feedback, readOnly, showSolution, onSpeak }: RendererProps) {
  let cfg: Record<string, unknown> = {};
  try { cfg = JSON.parse(item.config); } catch {}

  let correct: unknown = null;
  try { if (correctAnswer) correct = JSON.parse(correctAnswer); } catch {}

  const fb = feedback
    ? {
        isCorrect: feedback.isCorrect,
        hint: item.hint ?? undefined,
        solution: showSolution && correct !== null ? String(correct) : undefined,
        correctAnswers: showSolution && Array.isArray(correct) ? (correct as string[]) : undefined,
        correctIndex: showSolution ? (correct as string | string[]) : undefined,
        correctAnswer: showSolution ? String(correct ?? "") : undefined,
        correctMapping: showSolution ? (correct as Record<string, string[]>) : undefined,
        correctOrder: showSolution && Array.isArray(correct) ? (correct as string[]) : undefined,
      }
    : undefined;

  switch (item.type) {
    case "text_input":
      return (
        <TextInputWidget
          itemId={item.id}
          config={cfg as Parameters<typeof TextInputWidget>[0]["config"]}
          value={parseAnswer(item.id, "")}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb}
          readOnly={readOnly}
          onSpeak={onSpeak}
        />
      );

    case "fill_blank":
      return (
        <FillBlankWidget
          itemId={item.id}
          config={cfg as Parameters<typeof FillBlankWidget>[0]["config"]}
          value={parseAnswer(item.id, [])}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb}
          readOnly={readOnly}
        />
      );

    case "multiple_choice":
      return (
        <MultipleChoiceWidget
          itemId={item.id}
          config={cfg as Parameters<typeof MultipleChoiceWidget>[0]["config"]}
          value={parseAnswer(item.id, cfg.multiple ? [] : "")}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb}
          readOnly={readOnly}
          onSpeak={onSpeak}
        />
      );

    case "true_false":
      return (
        <TrueFalseWidget
          itemId={item.id}
          config={cfg as Parameters<typeof TrueFalseWidget>[0]["config"]}
          value={parseAnswer(item.id, "")}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb}
          readOnly={readOnly}
        />
      );

    case "drag_drop":
      return (
        <DragDropWidget
          itemId={item.id}
          config={cfg as Parameters<typeof DragDropWidget>[0]["config"]}
          value={parseAnswer(item.id, {})}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb}
          readOnly={readOnly}
        />
      );

    case "matching":
      return (
        <MatchingWidget
          itemId={item.id}
          config={cfg as Parameters<typeof MatchingWidget>[0]["config"]}
          value={parseAnswer(item.id, {})}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb as unknown as Parameters<typeof MatchingWidget>[0]["feedback"]}
          readOnly={readOnly}
        />
      );

    case "sorting":
      return (
        <SortingWidget
          itemId={item.id}
          config={cfg as Parameters<typeof SortingWidget>[0]["config"]}
          value={parseAnswer(item.id, [])}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb}
          readOnly={readOnly}
        />
      );

    case "drawing":
      return (
        <DrawingWidget
          itemId={item.id}
          config={cfg as Parameters<typeof DrawingWidget>[0]["config"]}
          value={parseAnswer(item.id, "")}
          onChange={(v) => setAnswer(item.id, v)}
          readOnly={readOnly}
        />
      );

    case "number_wall":
      return (
        <NumberWallWidget
          itemId={item.id}
          config={cfg as Parameters<typeof NumberWallWidget>[0]["config"]}
          value={parseAnswer(item.id, {})}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb as unknown as Parameters<typeof NumberWallWidget>[0]["feedback"]}
          readOnly={readOnly}
        />
      );

    case "number_line":
      return (
        <NumberLineWidget
          itemId={item.id}
          config={cfg as Parameters<typeof NumberLineWidget>[0]["config"]}
          value={parseAnswer(item.id, [])}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb}
          readOnly={readOnly}
        />
      );

    case "calculation_wheel":
      return (
        <CalculationWheelWidget
          itemId={item.id}
          config={cfg as Parameters<typeof CalculationWheelWidget>[0]["config"]}
          value={parseAnswer(item.id, {})}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb as unknown as Parameters<typeof CalculationWheelWidget>[0]["feedback"]}
          readOnly={readOnly}
        />
      );

    case "hundred_chart":
      return (
        <HundredChartWidget
          itemId={item.id}
          config={cfg as Parameters<typeof HundredChartWidget>[0]["config"]}
          value={parseAnswer(item.id, (cfg.mode === "fill" ? {} : []))}
          onChange={(v) => setAnswer(item.id, v)}
          feedback={fb}
          readOnly={readOnly}
        />
      );

    default:
      return (
        <div className="rounded border border-dashed border-border p-4 text-sm text-muted-fg">
          Unbekannter Widget-Typ: <code>{item.type}</code>
        </div>
      );
  }
}
