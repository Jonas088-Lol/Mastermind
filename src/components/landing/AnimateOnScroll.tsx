"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Animation = "fade-up" | "fade-in" | "slide-left" | "slide-right" | "scale-up";

interface Props {
  children: ReactNode;
  className?: string;
  animation?: Animation;
  delay?: number;
  threshold?: number;
}

export function AnimateOnScroll({
  children,
  className,
  animation = "fade-up",
  delay = 0,
  threshold = 0.1,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.visible = "true";
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, threshold]);

  return (
    <div ref={ref} data-visible="false" className={cn(`anim-${animation}`, className)}>
      {children}
    </div>
  );
}
