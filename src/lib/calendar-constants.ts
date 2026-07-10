/**
 * Shared Watch Calendar types + filter lists. No server-only imports, so both
 * the server data layer (calendar.ts) and client components can use these.
 */

export type CalKind = "movie" | "series" | "new_season" | "new_episode";
export type CalType = "all" | "movie" | "tv";
export type CalSort = "anticipated" | "soonest" | "rating";
export type CalTab = "coming_soon" | "new_episodes" | "new_seasons" | "movies" | "trailers";

export interface CalendarItem {
  id: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  kind: CalKind;
  title: string;
  poster: string | null;
  backdrop: string | null;
  genres: string[];
  releaseDate: string | null;
  releaseLabel: string;
  network: string | null;
  overview: string;
  popularity: number;
  voteAverage: number;
  fans: number;
}

export interface CalendarQuery {
  tab?: CalTab;
  type?: CalType;
  genre?: string | null;
  platform?: string | null;
  dateWindow?: CalDateWindow | null;
  sort?: CalSort;
  page?: number;
}

export interface CalendarOverview {
  featured: CalendarItem[];
  byGenre: { name: string; count: number }[];
  thisWeek: CalendarItem[];
  mostAnticipated: CalendarItem[];
  recentlyAdded: CalendarItem[];
  theaters: CalendarItem[];
}

/** Calendar genre chips → TMDb movie/tv genre ids (US, single-genre). */
export const CAL_GENRES: { name: string; movie?: number; tv?: number }[] = [
  { name: "Drama", movie: 18, tv: 18 },
  { name: "Action", movie: 28, tv: 10759 },
  { name: "Comedy", movie: 35, tv: 35 },
  { name: "Horror", movie: 27 },
  { name: "Sci-Fi", movie: 878, tv: 10765 },
  { name: "Fantasy", movie: 14, tv: 10765 },
  { name: "Crime", movie: 80, tv: 80 },
  { name: "Reality", tv: 10764 },
  { name: "Documentary", movie: 99, tv: 99 },
  { name: "Anime", movie: 16, tv: 16 },
  { name: "Family", movie: 10751, tv: 10751 },
  { name: "Thriller", movie: 53 },
  { name: "Mystery", movie: 9648, tv: 9648 },
  { name: "Romance", movie: 10749 },
];

/** US platform chips → TMDb TV network id + JustWatch provider id. */
export const CAL_PLATFORMS: { name: string; network?: number; provider?: number }[] = [
  { name: "Netflix", network: 213, provider: 8 },
  { name: "Hulu", network: 453, provider: 15 },
  { name: "Max", network: 3186, provider: 1899 },
  { name: "Disney+", network: 2739, provider: 337 },
  { name: "Prime Video", network: 1024, provider: 9 },
  { name: "Apple TV+", network: 2552, provider: 350 },
  { name: "Paramount+", network: 4330, provider: 531 },
  { name: "Peacock", network: 3353, provider: 386 },
  { name: "AMC+", network: 174, provider: 526 },
  { name: "FX", network: 88 },
  { name: "Theaters" },
];

export const CAL_DATE_WINDOWS = ["this_week", "this_month", "next_month", "next_90", "this_year"] as const;
export type CalDateWindow = (typeof CAL_DATE_WINDOWS)[number];

export const DATE_LABELS: Record<CalDateWindow, string> = {
  this_week: "This Week",
  this_month: "This Month",
  next_month: "Next Month",
  next_90: "Next 90 Days",
  this_year: "This Year",
};
