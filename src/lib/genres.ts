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
