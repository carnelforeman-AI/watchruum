"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, LayoutGrid, Film, Tv, Loader2 } from "lucide-react";
import { MediaGrid } from "@/components/media/media-card";
import { loadGenre } from "@/app/genre-actions";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";

const MAX_PAGES = 20;
const LETTERS = ["All", ...("ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split(""))];

type MediaFilter = "all" | "movie" | "tv";

export function GenreBrowser({
  genre,
  genres,
  initial,
  totalPages,
}: {
  genre: string;
  genres: string[];
  initial: MediaItem[];
  totalPages: number;
}) {
  const [items, setItems] = useState<MediaItem[]>(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initial.length === 0 || totalPages <= 1);
  const [type, setType] = useState<MediaFilter>("all");
  const [letter, setLetter] = useState("All");
  const [query, setQuery] = useState("");

  const sentinel = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string>>(new Set(initial.map((m) => m.id)));

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    const next = page + 1;
    try {
      const more = await loadGenre(genre, next);
      const fresh = more.filter((m) => !seen.current.has(m.id));
      fresh.forEach((m) => seen.current.add(m.id));
      setItems((prev) => [...prev, ...fresh]);
      setPage(next);
      if (more.length === 0 || next >= Math.min(totalPages, MAX_PAGES)) setDone(true);
    } finally {
      setLoading(false);
    }
  }, [genre, page, loading, done, totalPages]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "700px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const filtered = items.filter((m) => {
    if (type !== "all" && m.media_type !== type) return false;
    if (letter !== "All") {
      const first = (m.title[0] || "").toUpperCase();
      if (letter === "#") {
        if (/[A-Z]/.test(first)) return false;
      } else if (first !== letter) return false;
    }
    if (query.trim() && !m.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  // When a filter thins the visible set, keep pulling pages so browsing an
  // uncommon letter / query still fills up.
  useEffect(() => {
    if (!done && !loading && filtered.length < 12) loadMore();
  }, [filtered.length, done, loading, loadMore]);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-muted-2">Browse by Genre</p>
        <h1 className="text-2xl font-extrabold tracking-tight">{genre}</h1>
      </div>

      {/* Genre chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {genres.map((g) => (
          <Link
            key={g}
            href={`/genres?g=${encodeURIComponent(g)}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              g === genre
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "border-border bg-white/5 text-muted hover:text-foreground",
            )}
          >
            {g}
          </Link>
        ))}
      </div>

      {/* Within-genre search + type toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search within ${genre}…`}
            className="h-11 w-full rounded-xl border border-border bg-white/5 pl-10 pr-3 text-sm placeholder:text-muted-2 focus-visible:border-primary/60 focus-visible:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-white/[0.03] p-1">
          {(
            [
              { key: "all", label: "All", icon: LayoutGrid },
              { key: "movie", label: "Movies", icon: Film },
              { key: "tv", label: "Shows", icon: Tv },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                type === t.key ? "bg-primary text-white" : "text-muted hover:text-foreground",
              )}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* A-Z filter */}
      <div className="mb-5 flex flex-wrap gap-1">
        {LETTERS.map((l) => (
          <button
            key={l}
            onClick={() => setLetter(l)}
            className={cn(
              "grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[12px] font-semibold transition-colors",
              letter === l ? "bg-primary text-white" : "text-muted-2 hover:bg-white/5 hover:text-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <MediaGrid items={filtered} />
      ) : (
        !loading && (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="font-semibold">Nothing here yet</p>
            <p className="mt-1 text-sm text-muted">
              No {type === "movie" ? "movies" : type === "tv" ? "shows" : "titles"} match this filter in {genre}.
            </p>
          </div>
        )
      )}

      {/* Loader / sentinel */}
      <div ref={sentinel} className="h-10" />
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-2" />
        </div>
      )}
      {done && filtered.length > 0 && (
        <p className="py-4 text-center text-[13px] text-muted-2">That&apos;s everything in {genre}.</p>
      )}
    </div>
  );
}
