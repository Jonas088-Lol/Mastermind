"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Lightbulb, Volume2 } from "lucide-react";

interface Props {
  itemId: string;
  config: {
    label: string;
    placeholder?: string;
    multiline?: boolean;
    maxLength?: number;
  };
  value: string;
  onChange: (v: string) => void;
  feedback?: { isCorrect: boolean | null; hint?: string; solution?: string };
  readOnly?: boolean;
  onSpeak?: (text: string) => void;
}

export function TextInputWidget({
  itemId,
  config,
  value,
  onChange,
  feedback,
  readOnly,
  onSpeak,
}: Props) {
  const [hintVisible, setHintVisible] = useState(false);

  const baseInputClass =
    "w-full border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors placeholder:text-muted-fg focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={itemId}
          className="text-sm font-medium text-fg"
        >
          {config.label}
        </label>
        {onSpeak && config.label && (
          <button
            type="button"
            onClick={() => onSpeak(config.label)}
            className="text-muted-fg hover:text-fg transition-colors"
            aria-label="Vorlesen"
          >
            <Volume2 className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="relative">
        {config.multiline ? (
          <textarea
            id={itemId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={config.placeholder}
            maxLength={config.maxLength}
            readOnly={readOnly}
            rows={4}
            className={`${baseInputClass} resize-y py-2`}
          />
        ) : (
          <input
            id={itemId}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={config.placeholder}
            maxLength={config.maxLength}
            readOnly={readOnly}
            className={`${baseInputClass} h-11`}
          />
        )}

        {feedback && feedback.isCorrect !== null && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {feedback.isCorrect ? (
              <CheckCircle2
                className="size-5 text-success"
                strokeWidth={1.75}
              />
            ) : (
              <XCircle className="size-5 text-danger" strokeWidth={1.75} />
            )}
          </span>
        )}
      </div>

      {feedback && (
        <div className="flex flex-col gap-1.5">
          {feedback.hint && (
            <div>
              <button
                type="button"
                onClick={() => setHintVisible((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-fg hover:text-fg transition-colors"
              >
                <Lightbulb className="size-3.5" strokeWidth={1.75} />
                {hintVisible ? "Hinweis ausblenden" : "Hinweis anzeigen"}
              </button>
              {hintVisible && (
                <p className="mt-1 text-xs text-fg border border-border bg-surface px-3 py-2">
                  {feedback.hint}
                </p>
              )}
            </div>
          )}

          {feedback.isCorrect === false && feedback.solution && (
            <p className="text-xs text-muted-fg border border-success/30 bg-success/5 px-3 py-2">
              <span className="font-semibold text-success">Lösung:</span>{" "}
              {feedback.solution}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
