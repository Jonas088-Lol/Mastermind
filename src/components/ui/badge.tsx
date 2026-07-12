/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-fg",
        brand: "bg-brand text-brand-fg",
        outline: "border border-border-strong text-fg",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-danger/15 text-danger",
        info: "bg-info/15 text-info",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badge>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}
