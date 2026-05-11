"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

function useHasMounted() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHasMounted();

  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Theme umschalten">
        <span className="size-4"><Moon className="size-4" /></span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="size-4">
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </span>
    </Button>
  );
}
