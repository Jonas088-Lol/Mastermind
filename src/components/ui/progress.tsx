import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends ComponentProps<"div"> {
  value: number;
  max?: number;
  tone?: "brand" | "success" | "warning" | "danger";
}

const tones = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Progress({
  value,
  max = 100,
  tone = "brand",
  className,
  ...props
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
