/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition } from "react";
import { CheckCircle, KeyRound, Loader2 } from "lucide-react";
import { redeemClassCode } from "./actions";

export function ClassCodeRedeemer() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await redeemClassCode(formData);
      if (result.error) setError(result.error);
      if (result.success) setSuccess(result.success);
    });
  }

  if (success) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 p-4">
        <CheckCircle className="size-5 shrink-0 text-success" />
        <p className="text-sm font-semibold text-success">{success}</p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          name="code"
          type="text"
          placeholder="z.B. ABC-DEF-GHJ"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 font-mono text-sm uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-brand/50"
          required
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Einlösen
        </button>
      </div>
      {error && (
        <p className="text-xs font-medium text-error">{error}</p>
      )}
      <p className="text-xs text-muted-fg">
        Den Code bekommst du von deiner Schule oder deinem Lehrer.
      </p>
    </form>
  );
}
