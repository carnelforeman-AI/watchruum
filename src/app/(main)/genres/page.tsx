import Link from "next/link";
import { discoverByGenre, GENRES_BROWSE } from "@/lib/tmdb";
import { GenreBrowser } from "@/components/media/genre-browser";
import { posterGradient } from "@/lib/utils";

export const metadata = { title: "Genres · Watchruum" };
export const dynamic = "force-dynamic";

export default async function GenresPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams;
  const match = g ? GENRES_BROWSE.find((x) => x.name.toLowerCase() === g.toLowerCase()) : null;
  const genreNames = GENRES_BROWSE.map((x) => x.name);

  if (!match) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Browse by Genre</h1>
        <p className="mt-1 text-[13px] text-muted-2">Pick a genre to explore movies and shows.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GENRES_BROWSE.map((x) => (
            <Link
              key={x.name}
              href={`/genres?g=${encodeURIComponent(x.name)}`}
              className="glass-hover relative flex h-24 items-end overflow-hidden rounded-2xl p-4 ring-1 ring-white/10"
              style={{ background: posterGradient(x.name) }}
            >
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="relative text-lg font-extrabold drop-shadow">{x.name}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const { items, totalPages } = await discoverByGenre(match.name, 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <GenreBrowser
        key={match.name}
        genre={match.name}
        genres={genreNames}
        initial={items}
        totalPages={totalPages}
        hasMovie={!!match.movie}
        hasTv={!!match.tv}
      />
    </div>
  );
}
