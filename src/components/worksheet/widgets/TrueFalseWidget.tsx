/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { Check, X } from "lucide-react";

interface Props {
  itemId: string;
  config: { question: string; trueLabel?: string; falseLabel?: string };
  value: string;
  onChange: (v: string) => void;
  feedback?: { isCorrect: boolean | null; correctAnswer?: string };
  readOnly?: boolean;
}

export function TrueFalseWidget({
  itemId,
  config,
  value,
  onChange,
  feedback,
  readOnly,
}: Props) {
  function getButtonClass(option: "true" | "false"): string {
    const sel = value === option;
    const base =
      "flex flex-1 min-h-14 items-center justify-center gap-2 border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

    if (feedback) {
      const isCorrectOption = feedback.correctAnswer === option;
      const isWrongSelection = sel && !isCorrectOption;

      if (isCorrectOption) {
        return `${base} border-success bg-success text-white`;
      }
      if (isWrongSelection) {
        return `${base} border-danger bg-danger text-white`;
      }
      return `${base} border-border bg-bg text-muted-fg`;
    }

    if (sel) {
      return `${base} border-brand bg-brand text-brand-fg`;
    }
    return `${base} border-border bg-bg text-fg hover:border-brand/50 hover:bg-surface`;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-fg">{config.question}</p>

      <div className="flex gap-3">
        <button
          type="button"
          id={`${itemId}-true`}
          disabled={readOnly}
          onClick={() => onChange("true")}
          className={getButtonClass("true")}
        >
          <Check className="size-5" strokeWidth={2} />
          {config.trueLabel ?? "Richtig"}
        </button>

        <button
          type="button"
          id={`${itemId}-false`}
          disabled={readOnly}
          onClick={() => onChange("false")}
          className={getButtonClass("false")}
        >
          <X className="size-5" strokeWidth={2} />
          {config.falseLabel ?? "Falsch"}
        </button>
      </div>
    </div>
  );
}
