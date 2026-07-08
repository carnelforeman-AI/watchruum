import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-none",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-primary/15 text-primary",
        safe: "border-safe/40 bg-safe/15 text-safe",
        warn: "border-warn/40 bg-warn/15 text-warn",
        season: "border-season/40 bg-season/15 text-season",
        danger: "border-danger/40 bg-danger/15 text-danger",
        locked: "border-locked/40 bg-locked/15 text-locked",
        hot: "border-transparent bg-danger text-white shadow-[0_4px_14px_-4px_rgba(239,68,68,0.8)]",
        neutral: "border-border bg-white/5 text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
