import Link from "next/link";
import { Plus } from "lucide-react";
import { searchMedia, discoverCatalog, DISCOVER_MAX_PAGES, isTmdbConfigured } from "@/lib/tmdb";
import { MediaGrid } from "@/components/media/media-card";
import { ExploreSearch } from "@/components/media/explore-search";
import { Badge } from "@/components/ui/badge";
import type { MediaItem } from "@/lib/types";

export const metadata = { title: "Explore · Watchruum" };
export const dynamic = "force-dynamic";

const HEADINGS: Record<string, string> = {
  tv: "Trending TV shows",
  movies: "Trending movies",
  trending: "Trending this week",
  new: "Newest releases",
  active: "Most active",
  safe: "Spoiler-safe",
};

function applyFilter(items: MediaItem[], filter: string): MediaItem[] {
  switch (filter) {
    case "tv":
      return items.filter((m) => m.media_type === "tv");
    case "movies":
      return items.filter((m) => m.media_type === "movie");
    case "new":
      return [...items].sort((a, b) => (b.release_year ?? 0) - (a.release_year ?? 0));
    case "active":
      // No live activity metric yet — approximate "most active" by rating pull.
      return [...items].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
    case "safe":
    case "trending":
    default:
      return items;
  }
}

function moreLabel(filter: string): string {
  if (filter === "movies") return "Load more movies";
  if (filter === "tv") return "Load more shows";
  return "Load more titles";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q;
  const activeFilter = sp.filter && HEADINGS[sp.filter] ? sp.filter : "trending";
  const page = Math.max(1, Math.min(Number(sp.page ?? "1") || 1, DISCOVER_MAX_PAGES));

  // Search isn't paginated here; browsing grows the catalog page by page.
  const base = q ? await searchMedia(q) : await discoverCatalog(page);
  const results = applyFilter(base, activeFilter);

  const heading = q ? `Results for “${q}”` : HEADINGS[activeFilter];
  const canLoadMore = !q && page < DISCOVER_MAX_PAGES && results.length > 0;

  const moreHref = (() => {
    const p = new URLSearchParams();
    if (activeFilter !== "trending") p.set("filter", activeFilter);
    p.set("page", String(page + 1));
    return `/explore?${p.toString()}`;
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Discover</h1>
        {!isTmdbConfigured && (
          <Badge variant="neutral">Sample catalog — add a TMDb key for live results</Badge>
        )}
      </div>

      <ExploreSearch initial={q} activeFilter={activeFilter} />

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{heading}</h2>
          {canLoadMore && (
            <Link
              href={moreHref}
              scroll={false}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold text-muted transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
            >
              <Plus className="size-4" /> {moreLabel(activeFilter)}
            </Link>
          )}
        </div>

        {results.length ? (
          <>
            <MediaGrid items={results} />
            {canLoadMore ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href={moreHref}
                  scroll={false}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-5 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-110"
                >
                  <Plus className="size-4" /> {moreLabel(activeFilter)}
                </Link>
              </div>
            ) : (
              !q && (
                <p className="mt-6 text-center text-[13px] text-muted-2">
                  You&apos;ve reached the end — try a search to find anything specific.
                </p>
              )
            )}
          </>
        ) : (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="font-semibold">No titles found</p>
            <p className="mt-1 text-sm text-muted">
              {q ? "Try another search term." : "Nothing matches this filter right now."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
