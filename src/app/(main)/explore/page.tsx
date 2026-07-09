import { searchMedia, trending, isTmdbConfigured } from "@/lib/tmdb";
import { MediaGrid } from "@/components/media/media-card";
import { ExploreSearch } from "@/components/media/explore-search";
import { Badge } from "@/components/ui/badge";
import type { MediaItem } from "@/lib/types";

export const metadata = { title: "Explore · Watchruum" };

const HEADINGS: Record<string, string> = {
  tv: "Trending TV shows",
  movies: "Trending movies",
  trending: "Trending this week",
  new: "Newest releases",
  active: "Most active rooms",
  safe: "Spoiler-safe rooms",
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
      // Every Watchruum room is spoiler-safe, so this shows everything.
      return items;
    case "trending":
    default:
      return items;
  }
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q, filter } = await searchParams;
  const activeFilter = filter && HEADINGS[filter] ? filter : "trending";

  const base = q ? await searchMedia(q) : await trending();
  const results = applyFilter(base, activeFilter);

  const heading = q ? `Results for “${q}”` : HEADINGS[activeFilter];

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
        <h2 className="mb-3 text-lg font-bold">{heading}</h2>
        {results.length ? (
          <MediaGrid items={results} />
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
