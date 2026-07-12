/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useTransition, useRef } from "react";
import { CheckCircle2, Circle, Upload, Loader2 } from "lucide-react";
import { toggleHomeworkDone, uploadHomeworkFile } from "./actions";

interface Props {
  homeworkId: string;
  isDone: boolean;
  requiresUpload: boolean;
  hasFile: boolean;
}

export function HausaufgabenActions({ homeworkId, isDone, requiresUpload, hasFile }: Props) {
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleToggle() {
    startTransition(async () => {
      await toggleHomeworkDone(homeworkId, !isDone);
    });
  }

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("homeworkId", homeworkId);
    fd.append("file", file);
    startTransition(async () => {
      await uploadHomeworkFile(fd);
    });
  }

  // Upload-required: must upload file before marking done
  if (requiresUpload && !hasFile && !isDone) {
    return (
      <form onSubmit={handleUpload} className="mt-3 flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-fg">
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept="image/*,.pdf,.doc,.docx"
            required
            className="text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-brand/10 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
          Hochladen &amp; als erledigt markieren
        </button>
      </form>
    );
  }

  // Simple toggle button
  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleToggle}
      className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
        isDone
          ? "border-border bg-surface text-muted-fg hover:text-fg"
          : "border-brand/30 bg-brand/5 text-brand hover:bg-brand/10"
      }`}
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : isDone ? (
        <Circle className="size-3" />
      ) : (
        <CheckCircle2 className="size-3" />
      )}
      {isDone ? "Als offen markieren" : "Als erledigt markieren"}
    </button>
  );
}
