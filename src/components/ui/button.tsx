import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-[background-color,color,border-color,box-shadow,transform] outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-fg hover:bg-brand-dark hover:shadow-[0_12px_40px_-12px_hsl(var(--brand)/0.45)] hover:-translate-y-px active:translate-y-0",
        secondary:
          "bg-surface text-fg border border-border hover:border-fg/30",
        outline:
          "border border-border-strong text-fg hover:bg-surface",
        ghost:
          "text-fg hover:bg-surface",
        link:
          "text-brand underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-5",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
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
