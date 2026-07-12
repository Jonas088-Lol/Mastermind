/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { GradeResult } from "@/lib/ai/grade";
import { runAiGrade } from "../actions";
import { acceptSubmission } from "../submission-actions";

interface GradeFormProps {
  submissionId: string;
  currentGrade: number | null;
  currentComment: string;
  subjectId: string;
  studentId: string;
  isGraded: boolean;
  assignmentTitle: string;
  assignmentDescription: string | null;
  submissionContent: string | null;
  maxPoints: number | null;
  klasse: string;
  subjectName: string;
}

const GRADE_OPTIONS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];

function gradeColor(g: number) {
  if (g <= 2) return "border-success bg-success/10 text-success";
  if (g <= 3.5) return "border-warning bg-warning/10 text-warning";
  return "border-danger bg-danger/10 text-danger";
}

function buildDefaultRubric(maxPoints: number | null): { label: string; maxPoints: number }[] {
  const total = maxPoints ?? 10;
  const thirds = Math.floor(total / 3);
  const rest = total - 2 * thirds;
  return [
    { label: "Inhalt & Fachlichkeit", maxPoints: rest },
    { label: "Vollständigkeit & Methodik", maxPoints: thirds },
    { label: "Begründung & Ausdruck", maxPoints: thirds },
  ];
}

export function GradeForm({
  submissionId,
  currentGrade,
  currentComment,
  isGraded,
  assignmentTitle,
  assignmentDescription,
  submissionContent,
  maxPoints,
  klasse,
  subjectName,
}: GradeFormProps) {
  const [selected, setSelected] = useState<number | null>(currentGrade);
  const [comment, setComment] = useState(currentComment);
  const [done, setDone] = useState(isGraded);
  const [isPending, startTransition] = useTransition();

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<GradeResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    startTransition(async () => {
      await acceptSubmission(submissionId, selected, comment || undefined);
      setDone(true);
    });
  }

  function handleReopen() {
    setDone(false);
    setSelected(currentGrade);
    setComment(currentComment);
  }

  async function handleAiSuggest() {
    if (!submissionContent?.trim()) {
      setAiError("Keine Textabgabe vorhanden — KI-Korrektur nicht möglich.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    const result = await runAiGrade({
      assignment: assignmentDescription
        ? `${assignmentTitle}\n\n${assignmentDescription}`
        : assignmentTitle,
      submission: submissionContent,
      rubric: buildDefaultRubric(maxPoints),
      klasse,
      subject: subjectName,
    });
    setAiLoading(false);
    if (result.ok && result.result) {
      setAiResult(result.result);
      const snap = result.result;
      const rounded = GRADE_OPTIONS.reduce((prev, cur) =>
        Math.abs(cur - snap.grade) < Math.abs(prev - snap.grade) ? cur : prev
      );
      setSelected(rounded);
      if (snap.feedback) setComment(snap.feedback);
    } else {
      setAiError(result.error ?? "KI-Fehler");
    }
  }

  if (done && selected != null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 text-success" />
          <div>
            <p className="font-semibold text-success">Bewertet mit Note {selected.toFixed(1).replace(".", ",")}</p>
            {comment && <p className="mt-0.5 text-sm text-muted-fg">{comment}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={handleReopen}
          className="inline-flex w-fit items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-fg/30 hover:text-fg"
        >
          <RotateCcw className="size-3.5" />
          Note ändern
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* KI-Vorschlag */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Note wählen</p>
        <button
          type="button"
          onClick={handleAiSuggest}
          disabled={aiLoading || !submissionContent?.trim()}
          className="inline-flex items-center gap-1.5 border border-brand/40 bg-brand/6 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {aiLoading ? "KI korrigiert…" : "KI-Vorschlag"}
        </button>
      </div>

      {/* AI result panel */}
      {aiResult && (
        <div className="space-y-2 border border-brand/30 bg-brand/4 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-brand">
              KI-Vorschlag: Note {aiResult.grade.toFixed(1).replace(".", ",")}
            </span>
            <span className="text-muted-fg">Konfidenz {aiResult.confidence}%</span>
          </div>
          {aiResult.rubric.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-muted-fg">
              <span>{r.label}</span>
              <span className="font-mono">{r.awarded}/{r.max} P.</span>
            </div>
          ))}
          <p className="border-t border-brand/20 pt-2 text-muted-fg">{aiResult.feedback}</p>
          {aiResult.source === "mock" && (
            <p className="text-[10px] uppercase tracking-wider text-muted-fg">Mock-Modus · kein API-Key</p>
          )}
        </div>
      )}

      {aiError && (
        <p className="text-xs font-semibold text-danger">{aiError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {GRADE_OPTIONS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setSelected(g)}
            className={`w-14 border py-2 text-sm font-bold transition-colors ${
              selected === g
                ? gradeColor(g)
                : "border-border bg-bg text-muted-fg hover:border-fg/30 hover:text-fg"
            }`}
          >
            {g.toFixed(1).replace(".", ",")}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Kommentar (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Feedback für den Schüler…"
          className="w-full border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted-fg/50 focus:outline-none focus:ring-1 focus:ring-fg/20"
        />
      </div>

      <button
        type="submit"
        disabled={!selected || isPending}
        className="inline-flex w-fit items-center gap-2 bg-fg px-5 py-2 text-sm font-semibold text-bg transition-colors hover:bg-fg/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        {isGraded ? "Bewertung aktualisieren" : "Bewertung speichern"}
      </button>
    </form>
  );
}
