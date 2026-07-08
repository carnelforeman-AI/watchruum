import { searchMedia, trending, isTmdbConfigured } from "@/lib/tmdb";
import { MediaGrid } from "@/components/media/media-card";
import { ExploreSearch } from "@/components/media/explore-search";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Explore · Watchruum" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? await searchMedia(q) : await trending();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Discover</h1>
        {!isTmdbConfigured && (
          <Badge variant="neutral">Sample catalog — add a TMDb key for live results</Badge>
        )}
      </div>

      <ExploreSearch initial={q} />

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">
          {q ? `Results for “${q}”` : "Trending this week"}
        </h2>
        {results.length ? (
          <MediaGrid items={results} />
        ) : (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="font-semibold">No titles found</p>
            <p className="mt-1 text-sm text-muted">Try another search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
