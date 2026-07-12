/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl container-px", className)}
      {...props}
    />
  );
}
