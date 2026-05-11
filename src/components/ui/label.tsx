import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-muted-fg",
        className
      )}
      {...props}
    />
  );
}
