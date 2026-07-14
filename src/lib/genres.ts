/** Canonical favorite-genre options used across onboarding and the profile editor. */
export const GENRES = [
  "Drama",
  "Sci-Fi",
  "Thriller",
  "Fantasy",
  "Crime",
  "Comedy",
  "Horror",
  "Mystery",
  "Romance",
  "Action",
  "Documentary",
  "Reality",
] as const;

export type Genre = (typeof GENRES)[number];

/**
 * The /genres browse page groups some genres differently than the favorite-genre
 * labels used on profiles (TMDb combines these). Map a profile label to the
 * browse category it belongs to so a chip link lands on real results instead of
 * the empty index.
 */
const BROWSE_ALIAS: Record<string, string> = {
  "Sci-Fi": "Sci-Fi / Fantasy",
  Fantasy: "Sci-Fi / Fantasy",
  Action: "Action / Adventure",
};

/** Link target on /genres for a favorite-genre chip. */
export function genreHref(name: string): string {
  const target = BROWSE_ALIAS[name] ?? name;
  return `/genres?g=${encodeURIComponent(target)}`;
}
