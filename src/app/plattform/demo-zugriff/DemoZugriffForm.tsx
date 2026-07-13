/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition } from "react";
import { KeyRound, Copy, Check, Sparkles } from "lucide-react";
import { createDemo, type CreateDemoResult } from "./actions";

export function DemoZugriffForm() {
  const [result, setResult] = useState<Extract<CreateDemoResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createDemo(formData);
      if (res.ok) setResult(res);
      else setError(res.error);
    });
  }

  function copyAll() {
    if (!result) return;
    const text = `MasterMind Demo-Zugang\nSchule: ${result.schoolName}\nPasswort: ${result.password}\nZugang: /demo\nFreischaltung: ${result.activatesLabel}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="schoolName" className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Name der Schule</label>
          <input id="schoolName" name="schoolName" required maxLength={120}
            placeholder="z. B. Gymnasium Musterstadt"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="activatesAt" className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
            Freischaltung (optional)
          </label>
          <input id="activatesAt" name="activatesAt" type="date"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
          <p className="text-xs text-muted-fg">Leer lassen = sofort starten. Ab diesem Datum laufen die 7 Tage.</p>
        </div>
        <button type="submit" disabled={pending}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-fg transition-all hover:brightness-105 active:scale-95 disabled:opacity-50">
          <Sparkles className="size-4" /> {pending ? "Erstelle…" : "Demo-Zugang erstellen & Passwort generieren"}
        </button>
        {error && <p className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-2.5 text-sm font-medium text-danger">{error}</p>}
      </form>

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-success/40 bg-success/5 p-6">
          <div className="flex items-center gap-2 text-success">
            <KeyRound className="size-5" />
            <p className="font-bold">Zugang erstellt — an die Schule senden</p>
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <dt className="text-muted-fg">Schule</dt>
              <dd className="font-semibold">{result.schoolName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <dt className="text-muted-fg">Passwort</dt>
              <dd className="break-all font-mono font-bold">{result.password}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <dt className="text-muted-fg">Zugang über</dt>
              <dd className="font-mono">/demo</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-fg">Freischaltung</dt>
              <dd className="font-semibold">{result.activatesLabel}</dd>
            </div>
          </dl>
          <button type="button" onClick={copyAll}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-bg py-2.5 text-sm font-semibold transition-colors hover:bg-surface">
            {copied ? <><Check className="size-4 text-success" /> Kopiert</> : <><Copy className="size-4" /> Zugangsdaten kopieren</>}
          </button>
          <p className="text-xs text-muted-fg">
            Das Passwort wird verschlüsselt gespeichert und ist später unter „Aktive Demos" wieder einsehbar.
          </p>
        </div>
      )}
    </div>
  );
}
