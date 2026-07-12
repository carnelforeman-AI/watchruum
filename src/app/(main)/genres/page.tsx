import { discoverByGenre, getGenrePreviews, GENRES_BROWSE } from "@/lib/tmdb";
import { GenreBrowser } from "@/components/media/genre-browser";
import { GenreIndex } from "@/components/media/genre-index";

export const metadata = {
  title: "Genres · Watchruum",
  description: "Browse movies and TV shows by genre and join spoiler-safe fan discussions on Watchruum.",
};
export const dynamic = "force-dynamic";

export default async function GenresPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams;
  const match = g ? GENRES_BROWSE.find((x) => x.name.toLowerCase() === g.toLowerCase()) : null;
  const genreNames = GENRES_BROWSE.map((x) => x.name);

  if (!match) {
    const previews = await getGenrePreviews();
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Browse by Genre</h1>
        <p className="mt-1 text-[13px] text-muted-2">Explore movies and shows by the genres you love.</p>
        <GenreIndex genres={GENRES_BROWSE} previews={previews} />
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
        hasMovie={(match.movie?.length ?? 0) > 0}
        hasTv={(match.tv?.length ?? 0) > 0}
      />
    </div>
  );
}
