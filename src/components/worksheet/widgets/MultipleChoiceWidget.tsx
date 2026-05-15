"use client";

import { useMemo } from "react";
import { Volume2 } from "lucide-react";

interface Props {
  itemId: string;
  config: {
    question: string;
    options: string[];
    multiple?: boolean;
    shuffle?: boolean;
  };
  value: string | string[];
  onChange: (v: string | string[]) => void;
  feedback?: { isCorrect: boolean | null; correctIndex?: string | string[] };
  readOnly?: boolean;
  onSpeak?: (text: string) => void;
}

function isSelected(value: string | string[], index: string): boolean {
  if (Array.isArray(value)) return value.includes(index);
  return value === index;
}

function isCorrectOption(
  correctIndex: string | string[] | undefined,
  index: string
): boolean {
  if (!correctIndex) return false;
  if (Array.isArray(correctIndex)) return correctIndex.includes(index);
  return correctIndex === index;
}

export function MultipleChoiceWidget({
  itemId,
  config,
  value,
  onChange,
  feedback,
  readOnly,
  onSpeak,
}: Props) {
  const displayOrder = useMemo(() => {
    const indices = config.options.map((_, i) => String(i));
    if (!config.shuffle) return indices;
    const arr = [...indices];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [config.options, config.shuffle]);

  function handleChange(index: string) {
    if (readOnly) return;
    if (config.multiple) {
      const arr = Array.isArray(value) ? [...value] : value ? [value] : [];
      const next = arr.includes(index)
        ? arr.filter((v) => v !== index)
        : [...arr, index];
      onChange(next);
    } else {
      onChange(index);
    }
  }

  function getOptionClass(index: string): string {
    const sel = isSelected(value, index);
    const base =
      "flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition-colors select-none";

    if (feedback) {
      const correct = isCorrectOption(feedback.correctIndex, index);
      if (correct) {
        return `${base} border-success/50 bg-success/10 text-fg`;
      }
      if (sel && !correct) {
        return `${base} border-danger/50 bg-danger/10 text-fg`;
      }
      return `${base} border-border bg-bg text-muted-fg`;
    }

    if (sel) {
      return `${base} border-brand bg-brand/10 text-fg`;
    }
    return `${base} border-border bg-bg text-fg hover:border-brand/50 hover:bg-surface`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-fg">{config.question}</p>
        {onSpeak && (
          <button
            type="button"
            onClick={() => onSpeak(config.question)}
            className="shrink-0 text-muted-fg hover:text-fg transition-colors"
            aria-label="Vorlesen"
          >
            <Volume2 className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {displayOrder.map((index) => {
          const option = config.options[Number(index)];
          const sel = isSelected(value, index);
          const inputId = `${itemId}-option-${index}`;

          return (
            <label key={index} htmlFor={inputId} className={getOptionClass(index)}>
              <input
                id={inputId}
                type={config.multiple ? "checkbox" : "radio"}
                name={itemId}
                value={index}
                checked={sel}
                onChange={() => handleChange(index)}
                disabled={readOnly}
                className="sr-only"
              />
              <span
                className={`flex size-5 shrink-0 items-center justify-center border transition-colors ${
                  config.multiple ? "" : "rounded-full"
                } ${
                  sel
                    ? "border-brand bg-brand text-brand-fg"
                    : "border-border bg-bg"
                }`}
              >
                {sel && (
                  <span
                    className={`${
                      config.multiple ? "size-2.5 bg-white" : "size-2 rounded-full bg-white"
                    }`}
                  />
                )}
              </span>
              <span className="flex-1">{option}</span>
              {onSpeak && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onSpeak(option);
                  }}
                  className="text-muted-fg hover:text-fg transition-colors"
                  aria-label="Option vorlesen"
                >
                  <Volume2 className="size-3.5" strokeWidth={1.75} />
                </button>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
