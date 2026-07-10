import "server-only";
import { cache } from "react";
import { routeId } from "./utils";
import { tmdbGet, tmdbImg, TMDB_GENRE_NAMES, isTmdbConfigured } from "./tmdb";
import {
  CAL_GENRES,
  CAL_PLATFORMS,
  type CalDateWindow,
  type CalKind,
  type CalendarItem,
  type CalendarOverview,
  type CalendarQuery,
  type CalSort,
} from "./calendar-constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Watch Calendar data layer — upcoming movies, shows, seasons and episodes
 * from TMDb, US-focused. All dates come from TMDb community data, so treat
 * far-future dates as estimates.
 */

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
export function currentYear(): number {
  return today().getFullYear();
}

export function windowRange(w: CalDateWindow): { from: string; to: string } {
  const now = today();
  const from = fmt(now);
  const end = new Date(now);
  if (w === "this_week") end.setDate(end.getDate() + 7);
  else if (w === "this_month") end.setMonth(end.getMonth() + 1, 0);
  else if (w === "next_month") {
    end.setMonth(end.getMonth() + 2, 0);
    return { from: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 1)), to: fmt(end) };
  } else if (w === "next_90") end.setDate(end.getDate() + 90);
  else end.setFullYear(now.getFullYear(), 11, 31); // this_year
  return { from, to: fmt(end) };
}

function releaseLabel(iso: string | null): string {
  if (!iso) return "TBA";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "TBA";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fansFromPopularity(pop: number): number {
  // A deterministic, alive-looking "fans waiting" seed from TMDb popularity.
  return Math.max(0, Math.round(pop * 90));
}

function mapCal(r: any, mediaType: "movie" | "tv", kind: CalKind): CalendarItem {
  const title = mediaType === "movie" ? r.title : r.name;
  const date = mediaType === "movie" ? r.release_date : r.first_air_date;
  return {
    id: routeId(mediaType, r.id, title ?? "Untitled"),
    tmdbId: r.id,
    mediaType,
    kind,
    title: title ?? "Untitled",
    poster: tmdbImg(r.poster_path),
    backdrop: tmdbImg(r.backdrop_path, "w1280"),
    genres: (r.genre_ids ?? [])
      .map((id: number) => (TMDB_GENRE_NAMES as Record<number, string>)[id])
      .filter(Boolean),
    releaseDate: date || null,
    releaseLabel: releaseLabel(date || null),
    network: mediaType === "movie" ? "Theaters" : null,
    overview: r.overview ?? "",
    popularity: r.popularity ?? 0,
    voteAverage: Math.round((r.vote_average ?? 0) * 10) / 10,
    fans: fansFromPopularity(r.popularity ?? 0),
  };
}

const SORT_MOVIE: Record<CalSort, string> = {
  anticipated: "popularity.desc",
  soonest: "primary_release_date.asc",
  rating: "vote_average.desc",
};
const SORT_TV: Record<CalSort, string> = {
  anticipated: "popularity.desc",
  soonest: "first_air_date.asc",
  rating: "vote_average.desc",
};

async function discoverMovies(q: CalendarQuery): Promise<{ results: any[]; total_pages: number }> {
  const genre = q.genre ? CAL_GENRES.find((g) => g.name === q.genre)?.movie : undefined;
  const platform = q.platform ? CAL_PLATFORMS.find((p) => p.name === q.platform) : undefined;
  const range = q.dateWindow ? windowRange(q.dateWindow) : { from: fmt(today()), to: "" };
  const params: Record<string, string> = {
    sort_by: SORT_MOVIE[q.sort ?? "anticipated"],
    "primary_release_date.gte": range.from,
    with_release_type: "2|3",
    region: "US",
    watch_region: "US",
    include_adult: "false",
    page: String(q.page ?? 1),
  };
  if (range.to) params["primary_release_date.lte"] = range.to;
  if (genre) params.with_genres = String(genre);
  if (platform?.provider) params.with_watch_providers = String(platform.provider);
  // "Theaters" needs no provider filter; a streaming platform on a movie means
  // filter by provider (mostly matches once a title nears/after release).
  try {
    return await tmdbGet<{ results: any[]; total_pages: number }>("/discover/movie", params);
  } catch {
    return { results: [], total_pages: 1 };
  }
}

async function discoverTv(q: CalendarQuery, kind: CalKind): Promise<{ results: any[]; total_pages: number }> {
  const genre = q.genre ? CAL_GENRES.find((g) => g.name === q.genre)?.tv : undefined;
  const platform = q.platform ? CAL_PLATFORMS.find((p) => p.name === q.platform) : undefined;
  if (q.platform === "Theaters") return { results: [], total_pages: 1 }; // no TV in theaters
  const range = q.dateWindow ? windowRange(q.dateWindow) : { from: fmt(today()), to: "" };
  const dateKey = kind === "series" ? "first_air_date.gte" : "air_date.gte";
  const params: Record<string, string> = {
    sort_by: SORT_TV[q.sort ?? "anticipated"],
    [dateKey]: range.from,
    watch_region: "US",
    include_adult: "false",
    page: String(q.page ?? 1),
  };
  if (range.to) params[kind === "series" ? "first_air_date.lte" : "air_date.lte"] = range.to;
  if (kind === "new_season") params.with_status = "0"; // returning series
  if (genre) params.with_genres = String(genre);
  if (platform?.network) params.with_networks = String(platform.network);
  else if (platform?.provider) params.with_watch_providers = String(platform.provider);
  try {
    return await tmdbGet<{ results: any[]; total_pages: number }>("/discover/tv", params);
  } catch {
    return { results: [], total_pages: 1 };
  }
}

/** One page of calendar results for a tab + filters. */
export const loadCalendar = cache(
  async (q: CalendarQuery): Promise<{ items: CalendarItem[]; totalPages: number }> => {
    if (!isTmdbConfigured) return { items: [], totalPages: 1 };
    const tab = q.tab ?? "coming_soon";
    const type = q.type ?? "all";

    if (tab === "movies" || type === "movie") {
      const r = await discoverMovies(q);
      return { items: r.results.map((x) => mapCal(x, "movie", "movie")).filter((i) => i.poster), totalPages: r.total_pages ?? 1 };
    }
    if (tab === "new_episodes") {
      const r = await discoverTv(q, "new_episode");
      return { items: r.results.map((x) => mapCal(x, "tv", "new_episode")).filter((i) => i.poster), totalPages: r.total_pages ?? 1 };
    }
    if (tab === "new_seasons") {
      const r = await discoverTv(q, "new_season");
      return { items: r.results.map((x) => mapCal(x, "tv", "new_season")).filter((i) => i.poster), totalPages: r.total_pages ?? 1 };
    }
    if (type === "tv") {
      const r = await discoverTv(q, "series");
      return { items: r.results.map((x) => mapCal(x, "tv", "series")).filter((i) => i.poster), totalPages: r.total_pages ?? 1 };
    }
    // coming_soon / trailers → merge movies + tv
    const [mv, tv] = await Promise.all([discoverMovies(q), discoverTv(q, "series")]);
    const items = [
      ...mv.results.map((x) => mapCal(x, "movie", "movie")),
      ...tv.results.map((x) => mapCal(x, "tv", "series")),
    ]
      .filter((i) => i.poster)
      .sort((a, b) => (q.sort === "soonest" ? (a.releaseDate ?? "9").localeCompare(b.releaseDate ?? "9") : b.popularity - a.popularity));
    return { items, totalPages: Math.max(mv.total_pages ?? 1, tv.total_pages ?? 1) };
  },
);

/** Enrich TV items with their network name (cached per title). Movies stay "Theaters". */
const tvNetwork = cache(async (tmdbId: number): Promise<string | null> => {
  try {
    const d = await tmdbGet<{ networks?: { name: string }[] }>(`/tv/${tmdbId}`, {});
    return d.networks?.[0]?.name ?? null;
  } catch {
    return null;
  }
});

async function withNetworks(items: CalendarItem[]): Promise<CalendarItem[]> {
  return Promise.all(
    items.map(async (i) => (i.mediaType === "tv" ? { ...i, network: (await tvNetwork(i.tmdbId)) ?? "TV" } : i)),
  );
}


/** The landing "Coming Soon" overview — hero carousel + all the rails. */
export const getCalendarOverview = cache(async (): Promise<CalendarOverview> => {
  if (!isTmdbConfigured) {
    return { featured: [], byGenre: [], thisWeek: [], mostAnticipated: [], recentlyAdded: [], theaters: [] };
  }

  const [comingSoon, thisWeekRaw, theatersRaw, genreCounts] = await Promise.all([
    loadCalendar({ tab: "coming_soon", sort: "anticipated" }),
    loadCalendar({ tab: "coming_soon", dateWindow: "this_week", sort: "soonest" }),
    discoverMovies({ sort: "soonest" }),
    Promise.all(
      CAL_GENRES.slice(0, 6).map(async (g) => {
        const r = await loadCalendar({ tab: "coming_soon", genre: g.name, sort: "anticipated" });
        return { name: g.name, count: r.totalPages > 1 ? r.items.length * 4 : r.items.length };
      }),
    ),
  ]);

  const featured = await withNetworks(comingSoon.items.slice(0, 6));
  const thisWeek = await withNetworks(thisWeekRaw.items.slice(0, 12));
  const mostAnticipated = await withNetworks(comingSoon.items.slice(0, 12));
  const recentlyAdded = await withNetworks([...comingSoon.items].reverse().slice(0, 12));
  const theaters = theatersRaw.results.map((x) => mapCal(x, "movie", "movie")).filter((i) => i.poster).slice(0, 6);

  return {
    featured,
    byGenre: genreCounts.sort((a, b) => b.count - a.count),
    thisWeek,
    mostAnticipated,
    recentlyAdded,
    theaters,
  };
});

/** Search upcoming titles by text (future release dates only). */
export const searchCalendar = cache(async (query: string, page = 1): Promise<CalendarItem[]> => {
  const q = query.trim();
  if (!q || !isTmdbConfigured) return [];
  const cutoff = fmt(today());
  const [mv, tv] = await Promise.all([
    tmdbGet<{ results: any[] }>("/search/movie", { query: q, include_adult: "false", page: String(page) }).catch(() => ({ results: [] })),
    tmdbGet<{ results: any[] }>("/search/tv", { query: q, include_adult: "false", page: String(page) }).catch(() => ({ results: [] })),
  ]);
  const items = [
    ...mv.results.map((x) => mapCal(x, "movie", "movie")),
    ...tv.results.map((x) => mapCal(x, "tv", "series")),
  ].filter((i) => i.poster && i.releaseDate && i.releaseDate >= cutoff);
  return items.sort((a, b) => (a.releaseDate ?? "9").localeCompare(b.releaseDate ?? "9"));
});

/** First YouTube trailer key for a title, or null. */
export const getTrailerKey = cache(async (tmdbId: number, mediaType: "movie" | "tv"): Promise<string | null> => {
  if (!isTmdbConfigured) return null;
  try {
    const d = await tmdbGet<{ results: { key: string; site: string; type: string }[] }>(`/${mediaType}/${tmdbId}/videos`, {});
    const vids = d.results ?? [];
    const pick =
      vids.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      vids.find((v) => v.site === "YouTube" && v.type === "Teaser") ??
      vids.find((v) => v.site === "YouTube");
    return pick?.key ?? null;
  } catch {
    return null;
  }
});
