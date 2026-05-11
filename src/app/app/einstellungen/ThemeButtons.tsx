"use client";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function useHasMounted() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export function ThemeButtons() {
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();
  if (!mounted)
    return (
      <div className="grid grid-cols-3 gap-px border border-border bg-border h-[46px]" />
    );

  const options = [
    { label: "Hell", value: "light" },
    { label: "Dunkel", value: "dark" },
    { label: "System", value: "system" },
  ];

  return (
    <div className="grid grid-cols-3 gap-px border border-border bg-border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          onClick={() => setTheme(o.value)}
          className={`px-4 py-3 text-sm transition-colors ${
            theme === o.value
              ? "bg-fg text-bg"
              : "bg-bg text-muted-fg hover:bg-surface"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
