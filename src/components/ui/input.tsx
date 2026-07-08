import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-border bg-white/5 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-2 transition-colors focus-visible:outline-none focus-visible:border-primary/60 focus-visible:bg-white/[0.07] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full rounded-xl border border-border bg-white/5 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-2 transition-colors focus-visible:outline-none focus-visible:border-primary/60 focus-visible:bg-white/[0.07] disabled:opacity-50 resize-none",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
