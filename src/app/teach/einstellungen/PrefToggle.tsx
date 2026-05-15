"use client";

import { useOptimistic, useTransition } from "react";
import { updatePref } from "./actions";

interface PrefToggleProps {
  prefKey: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  defaultOn: boolean;
}

export function PrefToggle({ prefKey, label, detail, icon, defaultOn }: PrefToggleProps) {
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useOptimistic(defaultOn);

  function toggle() {
    const next = !on;
    startTransition(async () => {
      setOn(next);
      const fd = new FormData();
      fd.set("value", String(next));
      await updatePref(prefKey, fd);
    });
  }

  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center bg-surface text-muted-fg">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-fg">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={toggle}
        disabled={pending}
        className={`relative h-5 w-9 shrink-0 transition-colors disabled:opacity-60 ${
          on ? "bg-brand" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 bg-bg transition-[left] ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
