/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generateVocabFromText } from "../actions";

export function AIImportForm({ listId }: { listId: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    if (!text.trim()) return;
    setResult(null);
    startTransition(async () => {
      const res = await generateVocabFromText(listId, text);
      if (res?.error) setResult(`Fehler: ${res.error}`);
      else if (res?.success) setResult(`${res.success} Vokabeln hinzugefügt!`);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-fg">Text einfügen — KI generiert automatisch Vokabelpaare.</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Lerntext, Aufgabenstellung oder beliebigen Text einfügen…"
        rows={4}
        className="w-full resize-none border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      {result && (
        <p className={`text-xs font-medium ${result.startsWith("Fehler") ? "text-danger" : "text-success"}`}>
          {result}
        </p>
      )}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!text.trim() || pending}
        className="flex w-full items-center justify-center gap-2 bg-brand py-2 text-sm font-semibold text-brand-fg disabled:opacity-50 hover:opacity-90"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" strokeWidth={1.75} />}
        {pending ? "Generiert…" : "Vokabeln generieren"}
      </button>
    </div>
  );
}
