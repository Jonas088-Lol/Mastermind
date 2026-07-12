/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useOptimistic, useTransition } from "react";
import { updatePref } from "./actions";

interface PrefSelectorProps<T extends string> {
  prefKey: string;
  options: { value: T; label: string; sub?: string }[];
  current: T;
}

export function PrefSelector<T extends string>({ prefKey, options, current }: PrefSelectorProps<T>) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useOptimistic(current);

  function select(value: T) {
    startTransition(async () => {
      setSelected(value);
      const fd = new FormData();
      fd.set("value", value);
      await updatePref(prefKey, fd);
    });
  }

  return (
    <div className="grid gap-px border border-border bg-border" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={selected === o.value}
          disabled={pending}
          onClick={() => select(o.value)}
          className={`px-4 py-3 text-sm transition-colors disabled:opacity-60 ${
            selected === o.value ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
          }`}
        >
          {o.sub && <span className="block font-mono text-[10px] uppercase tracking-wider opacity-70">{o.sub}</span>}
          <span className={o.sub ? "font-semibold" : ""}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
