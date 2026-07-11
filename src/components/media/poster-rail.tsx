"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Poster } from "@/components/media/poster";
import type { MediaItem } from "@/lib/types";

/** Horizontally scrollable poster row (titles) with left/right arrow controls. */
export function PosterRail({ items }: { items: MediaItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    const on = () => update();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 560, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {!atStart && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className="absolute left-0 top-[78px] z-20 grid size-11 -translate-x-1/2 place-items-center rounded-full border border-border bg-bg-elevated/90 text-primary shadow-lg backdrop-blur transition hover:bg-primary/20"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {!atEnd && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-[195px] w-16 bg-gradient-to-l from-bg to-transparent" />
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="absolute right-0 top-[78px] z-20 grid size-11 translate-x-1/2 place-items-center rounded-full border border-border bg-bg-elevated/90 text-primary shadow-lg backdrop-blur transition hover:bg-primary/20"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      <div ref={ref} onScroll={update} className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {items.map((c) => (
          <Link key={c.id} href={`/title/${c.id}`} className="group w-[130px] shrink-0">
            <Poster
              title={c.title}
              src={c.poster_url}
              showTitle={!c.poster_url}
              className="aspect-[2/3] w-[130px] transition group-hover:ring-2 group-hover:ring-primary/50"
            />
            <p className="mt-1.5 truncate text-[12px] font-semibold transition-colors group-hover:text-primary">
              {c.title}
            </p>
            <p className="text-[11px] text-muted-2">
              {c.media_type === "tv" ? "Show" : "Movie"}
              {c.release_year ? ` · ${c.release_year}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
