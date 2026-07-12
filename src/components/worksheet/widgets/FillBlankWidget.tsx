/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

interface Props {
  itemId: string;
  config: {
    text: string;
    blanks: Array<{ id: string; size?: number }>;
  };
  value: string[];
  onChange: (values: string[]) => void;
  feedback?: { isCorrect: boolean | null; correctAnswers?: string[] };
  readOnly?: boolean;
}

const BLANK_RE = /\{\{blank:([^}]+)\}\}/g;

export function FillBlankWidget({
  itemId,
  config,
  value,
  onChange,
  feedback,
  readOnly,
}: Props) {
  const blankIds = config.blanks.map((b) => b.id);

  function handleChange(index: number, v: string) {
    const next = [...value];
    next[index] = v;
    onChange(next);
  }

  function getBlankBorderClass(index: number): string {
    if (!feedback || feedback.isCorrect === null) return "border-border";
    if (!feedback.correctAnswers) {
      return feedback.isCorrect ? "border-success" : "border-danger";
    }
    const correct = feedback.correctAnswers[index];
    const student = (value[index] ?? "").trim().toLowerCase();
    if (correct === undefined) return "border-border";
    return student === correct.trim().toLowerCase()
      ? "border-success"
      : "border-danger";
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  BLANK_RE.lastIndex = 0;

  while ((match = BLANK_RE.exec(config.text)) !== null) {
    const blankId = match[1];
    const blankIndex = blankIds.indexOf(blankId);
    const blankConfig = config.blanks[blankIndex];

    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {config.text.slice(lastIndex, match.index)}
        </span>
      );
    }

    parts.push(
      <input
        key={`blank-${blankId}`}
        type="text"
        id={`${itemId}-blank-${blankId}`}
        value={value[blankIndex] ?? ""}
        onChange={(e) => handleChange(blankIndex, e.target.value)}
        readOnly={readOnly}
        style={{ width: blankConfig?.size ? `${blankConfig.size * 0.65}rem` : "6rem" }}
        className={`mx-1 inline-block border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent px-1 text-sm text-fg outline-none transition-colors focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 ${getBlankBorderClass(blankIndex)}`}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < config.text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{config.text.slice(lastIndex)}</span>
    );
  }

  return (
    <div className="text-sm text-fg leading-loose">
      {parts}
    </div>
  );
}
