/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 rounded-lg select-none",
  {
    variants: {
      variant: {
        // Bewusst KEIN Verlauf hier: Buttons, die den Farbverlauf tragen sollen,
        // bekommen explizit .pastel-cta. Zwei Verlaufs-Klassen auf demselben
        // Element haben sich sonst gegenseitig überschrieben.
        primary:
          "bg-brand text-brand-fg shadow-sm hover:bg-brand-dark hover:shadow-md active:scale-[0.97]",
        secondary:
          "bg-surface-2 text-fg border border-border hover:border-border-strong hover:bg-surface active:scale-[0.97]",
        outline:
          "border border-border-strong text-fg bg-bg hover:bg-surface hover:border-brand/40 active:scale-[0.97]",
        ghost:
          "text-fg hover:bg-surface active:scale-[0.97]",
        link:
          "text-brand underline-offset-4 hover:underline px-0 h-auto",
        danger:
          "bg-danger text-white hover:bg-danger/90 shadow-sm active:scale-[0.97]",
      },
      size: {
        xs: "h-7 px-2.5 text-[11px] rounded-md",
        sm: "h-9 px-3.5 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[15px]",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { button as buttonVariants };
