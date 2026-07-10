"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, LayoutGrid, Film, Tv, Loader2 } from "lucide-react";
import { MediaGrid } from "@/components/media/media-card";
import { loadGenre, searchGenre } from "@/app/genre-actions";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";
import type { GenreType } from "@/lib/tmdb";

// Keep in sync with GENRE_MAX_PAGES in tmdb.ts — TMDb's hard page ceiling.
const MAX_PAGES = 500;
const LETTERS = ["All", ...("ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split(""))];

/** First letter for A–Z filing: ignores a leading article and uppercases. */
function fileLetter(title: string): string {
  const t = title.replace(/^(the|a|an)\s+/i, "").trim();
  return (t[0] || "").toUpperCase();
}

export function GenreBrowser({
  genre,
  genres,
  initial,
  totalPages,
  hasMovie = true,
  hasTv = true,
}: {
  genre: string;
  genres: string[];
  initial: MediaItem[];
  totalPages: number;
  hasMovie?: boolean;
  hasTv?: boolean;
}) {
  const [items, setItems] = useState<MediaItem[]>(initial);
  const [page, setPage] = useState(1);
  const [totalP, setTotalP] = useState(totalPages);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initial.length === 0 || totalPages <= 1);
  const [type, setType] = useState<GenreType>("all");
  const [letter, setLetter] = useState("All");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  const sentinel = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string>>(new Set(initial.map((m) => m.id)));
  const firstRun = useRef(true);
  const reqId = useRef(0);

  const searching = debounced.trim().length > 0;

  // Debounce the search box so we query on pause, not per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchAt = useCallback(
    (p: number) => (searching ? searchGenre(genre, debounced, p, type) : loadGenre(genre, p, type)),
    [genre, debounced, type, searching],
  );

  // Whenever the source changes (type or search term), reset and refetch page 1
  // from the server so results are complete — not filtered from a loaded slice.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    fetchAt(1)
      .then(({ items: first, totalPages: tp }) => {
        if (id !== reqId.current) return;
        seen.current = new Set(first.map((m) => m.id));
        setItems(first);
        setPage(1);
        setTotalP(tp);
        setDone(first.length === 0 || tp <= 1);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [fetchAt]);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    const id = reqId.current;
    const next = page + 1;
    try {
      const { items: more, totalPages: tp } = await fetchAt(next);
      if (id !== reqId.current) return; // a reset happened; drop stale page
      const fresh = more.filter((m) => !seen.current.has(m.id));
      fresh.forEach((m) => seen.current.add(m.id));
      setItems((prev) => [...prev, ...fresh]);
      setPage(next);
      if (more.length === 0 || next >= Math.min(tp, MAX_PAGES)) setDone(true);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [fetchAt, page, loading, done]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: "700px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  // A–Z is a client index over what's loaded (TMDb has no starts-with filter).
  const filtered = useMemo(() => {
    if (letter === "All") return items;
    return items.filter((m) => {
      const first = fileLetter(m.title);
      return letter === "#" ? !/[A-Z]/.test(first) : first === letter;
    });
  }, [items, letter]);

  // Keep pulling pages while an active letter thins the visible set.
  useEffect(() => {
    if (letter !== "All" && !done && !loading && filtered.length < 12) loadMore();
  }, [letter, filtered.length, done, loading, loadMore]);

  const TYPES: { key: GenreType; label: string; icon: typeof Film; enabled: boolean }[] = [
    { key: "all", label: "All", icon: LayoutGrid, enabled: hasMovie || hasTv },
    { key: "movie", label: "Movies", icon: Film, enabled: hasMovie },
    { key: "tv", label: "Shows", icon: Tv, enabled: hasTv },
  ];

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
          {TYPES.map((t) => (
            <button
              key={t.key}
              disabled={!t.enabled}
              onClick={() => setType(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                type === t.key ? "bg-primary text-white" : "text-muted hover:text-foreground",
                !t.enabled && "cursor-not-allowed opacity-30 hover:text-muted",
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
              {searching
                ? `No ${type === "movie" ? "movies" : type === "tv" ? "shows" : "titles"} match “${debounced}” in ${genre}.`
                : `No ${type === "movie" ? "movies" : type === "tv" ? "shows" : "titles"} match this filter in ${genre}.`}
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
        <p className="py-4 text-center text-[13px] text-muted-2">
          {searching ? `That's every match in ${genre}.` : `That's everything in ${genre}.`}
        </p>
      )}
    </div>
  );
}
