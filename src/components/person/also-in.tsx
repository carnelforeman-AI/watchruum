"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Poster } from "@/components/media/poster";
import type { MediaItem } from "@/lib/types";

const INITIAL = 12;

/** Filmography grid ("Also in") with a Show all / Show less toggle. */
export function AlsoIn({ items }: { items: MediaItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const hasMore = items.length > INITIAL;
  const visible = expanded ? items : items.slice(0, INITIAL);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Also in</h2>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary transition hover:text-primary-strong"
          >
            {expanded ? "Show less" : `Show all (${items.length})`}
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {visible.map((c) => (
          <Link key={c.id} href={`/title/${c.id}`} className="group">
            <Poster
              title={c.title}
              src={c.poster_url}
              showTitle={!c.poster_url}
              className="aspect-[2/3] w-full transition group-hover:ring-2 group-hover:ring-primary/50"
            />
            <p className="mt-1.5 truncate text-[12px] font-semibold">{c.title}</p>
            <p className="text-[11px] text-muted-2">
              {c.media_type === "tv" ? "Show" : "Movie"}
              {c.release_year ? ` · ${c.release_year}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
