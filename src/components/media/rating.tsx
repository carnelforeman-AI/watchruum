"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold text-warn", className)}>
      <Star className="size-3.5 fill-warn text-warn" />
      {score.toFixed(1)}
    </span>
  );
}

/** Interactive 1–10 star rating (halves rendered as full for simplicity). */
export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 20,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 10 }, (_, i) => {
          const v = i + 1;
          const active = v <= shown;
          return (
            <button
              key={v}
              type="button"
              disabled={readOnly}
              onMouseEnter={() => !readOnly && setHover(v)}
              onClick={() => !readOnly && onChange?.(v)}
              className={cn("px-0.5 transition-transform", !readOnly && "hover:scale-125 cursor-pointer")}
              aria-label={`Rate ${v} of 10`}
            >
              <Star
                style={{ width: size, height: size }}
                className={active ? "fill-warn text-warn" : "text-white/20"}
              />
            </button>
          );
        })}
      </div>
      <span className="w-12 text-sm font-bold tabular-nums text-foreground">{shown}/10</span>
    </div>
  );
}
