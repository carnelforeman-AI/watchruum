"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal, snap-free card row with large scroll arrows that appear only
 * when there's more content off-screen. Reusable across curated title rows.
 * `arrowTop` positions the arrows vertically (default centers on a w-44 poster).
 */
export function CardRow({
  children,
  arrowTop = "top-[132px]",
}: {
  children: React.ReactNode;
  arrowTop?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 320), behavior: "smooth" });
  };

  const btn =
    "absolute z-20 grid size-14 -translate-y-1/2 place-items-center rounded-full " +
    "bg-black/75 text-white ring-1 ring-white/20 shadow-xl backdrop-blur transition " +
    "hover:bg-primary hover:ring-primary/60 active:scale-95";

  return (
    <div className="relative">
      <div ref={ref} className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-1">
        {children}
      </div>
      {canLeft && (
        <button type="button" aria-label="Scroll left" onClick={() => nudge(-1)} className={cn(btn, arrowTop, "left-1")}>
          <ChevronLeft className="size-7" />
        </button>
      )}
      {canRight && (
        <button type="button" aria-label="Scroll right" onClick={() => nudge(1)} className={cn(btn, arrowTop, "right-1")}>
          <ChevronRight className="size-7" />
        </button>
      )}
    </div>
  );
}
