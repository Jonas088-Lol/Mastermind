/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends ComponentProps<"div"> {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  src?: string;
}

const sizes = {
  xs: "size-6 text-[9px]",
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = "md", src, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "grid place-items-center overflow-hidden rounded-full bg-brand/10 font-semibold text-brand ring-1 ring-border",
        sizes[size],
        className
      )}
      aria-label={name}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
