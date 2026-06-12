import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-bg px-3.5 text-sm text-fg outline-none transition-all duration-150",
        "placeholder:text-muted-fg",
        "hover:border-border-strong",
        "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/15",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
