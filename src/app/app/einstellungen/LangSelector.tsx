"use client";

import { useOptimistic, useTransition } from "react";
import { updatePref } from "./actions";

const LANGS = [
  { code: "de", label: "Deutsch", display: "DE" },
  { code: "en", label: "English", display: "EN" },
  { code: "tr", label: "Türkçe", display: "TR" },
  { code: "pl", label: "Polski", display: "PL" },
];

export function LangSelector({ current }: { current: string }) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useOptimistic(current);

  function select(code: string) {
    startTransition(async () => {
      setSelected(code);
      const fd = new FormData();
      fd.set("value", code);
      await updatePref("lang", fd);
    });
  }

  return (
    <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          aria-pressed={selected === l.code}
          disabled={pending}
          onClick={() => select(l.code)}
          className={`flex flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors disabled:opacity-60 ${
            selected === l.code ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
            {l.display}
          </span>
          <span className="text-sm font-semibold">{l.label}</span>
        </button>
      ))}
    </div>
  );
}
