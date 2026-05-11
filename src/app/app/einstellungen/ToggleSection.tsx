"use client";
import { useState } from "react";

type ToggleItem = {
  key: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  default: boolean;
};

export function ToggleSection({
  items,
  storageKey,
}: {
  items: ToggleItem[];
  storageKey: string;
}) {
  const [values, setValues] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(items.map((i) => [i.key, i.default]));
    if (typeof window === "undefined") return defaults;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return { ...defaults, ...JSON.parse(stored) };
    } catch {}
    return defaults;
  });

  function toggle(key: string) {
    setValues((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-start gap-3 border-b border-border py-3 last:border-b-0"
        >
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center bg-surface text-muted-fg">
            {item.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="mt-0.5 text-xs text-muted-fg">{item.detail}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={values[item.key]}
            aria-label="Umschalten"
            onClick={() => toggle(item.key)}
            className={`relative h-5 w-9 shrink-0 transition-colors ${
              values[item.key] ? "bg-brand" : "bg-border-strong"
            }`}
          >
            <span
              className={`absolute top-0.5 size-4 bg-bg transition-[left] ${
                values[item.key] ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
