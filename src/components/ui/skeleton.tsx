/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse bg-surface-2", className)}
      aria-hidden
      {...props}
    />
  );
}
