"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { posterGradient, initials } from "@/lib/utils";

interface CastPerson {
  id: number;
  name: string;
  character: string;
  profile_url: string | null;
}

/** Horizontally scrollable cast row with left/right arrow controls. */
export function CastRail({ cast }: { cast: CastPerson[] }) {
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
    const el = ref.current;
    if (!el) return;
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 520, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Left arrow */}
      {!atStart && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Scroll cast left"
          className="absolute left-0 top-[58px] z-20 grid size-11 -translate-x-1/2 place-items-center rounded-full border border-border bg-bg-elevated/90 text-primary shadow-lg backdrop-blur transition hover:bg-primary/20"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {/* Right fade + arrow */}
      {!atEnd && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-40 w-16 bg-gradient-to-l from-bg to-transparent" />
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll cast right"
            className="absolute right-0 top-[58px] z-20 grid size-11 translate-x-1/2 place-items-center rounded-full border border-border bg-bg-elevated/90 text-primary shadow-lg backdrop-blur transition hover:bg-primary/20"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      <div
        ref={ref}
        onScroll={update}
        className="no-scrollbar flex gap-4 overflow-x-auto pb-2"
      >
        {cast.map((c) => (
          <Link key={c.id} href={`/person/${c.id}`} className="group w-[132px] shrink-0">
            <div className="relative h-40 w-[132px] overflow-hidden rounded-xl ring-1 ring-border transition group-hover:ring-2 group-hover:ring-primary/50">
              {c.profile_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.profile_url} alt={c.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="grid h-full w-full place-items-center text-2xl font-extrabold text-white/85"
                  style={{ background: posterGradient(c.name) }}
                >
                  {initials(c.name)}
                </div>
              )}
            </div>
            <p className="mt-2 truncate text-sm font-bold transition-colors group-hover:text-primary">
              {c.name}
            </p>
            {c.character && (
              <p className="truncate text-[11px] uppercase tracking-wide text-muted">{c.character}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
