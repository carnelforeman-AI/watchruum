import "server-only";
import { cache } from "react";
import type { Episode, MediaItem, Season } from "./types";
import { MEDIA, MEDIA_BY_ID, SEASONS, episodesFor } from "./mock-data";
import { routeId } from "./utils";

/**
 * TMDb metadata client.
 *
 * When TMDB_API_KEY / TMDB_READ_ACCESS_TOKEN is set, hits the real API.
 * Otherwise falls back to the fictional mock catalog so the app is fully
 * functional offline and ships no copyrighted artwork.
 */

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const KEY = process.env.TMDB_API_KEY ?? "";
const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN ?? "";

export const isTmdbConfigured = KEY.length > 0 || TOKEN.length > 0;

function img(path: string | null, size = "w500"): string | null {
  return path ? `${IMG}/${size}${path}` : null;
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = { accept: "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  else url.searchParams.set("api_key", KEY);

  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDb ${res.status}`);
  return res.json() as Promise<T>;
}

const GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action", 10765: "Sci-Fi", 10768: "War", 10767: "Talk", 10764: "Reality",
};

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapMedia(r: any, type: "movie" | "tv"): MediaItem {
  const title = type === "movie" ? r.title : r.name;
  const date = type === "movie" ? r.release_date : r.first_air_date;
  return {
    id: routeId(type, r.id, title ?? "Untitled"),
    tmdb_id: r.id,
    media_type: type,
    title: title ?? "Untitled",
    overview: r.overview ?? "",
    poster_url: img(r.poster_path),
    backdrop_url: img(r.backdrop_path, "w1280"),
    release_year: date ? Number(date.slice(0, 4)) : null,
    genres: (r.genre_ids ?? r.genres?.map((g: any) => g.id) ?? [])
      .map((id: number) => GENRES[id])
      .filter(Boolean),
    vote_average: Math.round((r.vote_average ?? 0) * 10) / 10,
    vote_count: r.vote_count ?? 0,
    number_of_seasons: r.number_of_seasons,
  };
}

// --- Public API -------------------------------------------------------

export async function searchMedia(query: string): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  if (!isTmdbConfigured) {
    const q = query.toLowerCase();
    return MEDIA.filter((m) => m.title.toLowerCase().includes(q));
  }
  const data = await tmdb<{ results: any[] }>("/search/multi", { query });
  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => mapMedia(r, r.media_type))
    .slice(0, 24);
}

/**
 * A broad, varied catalog. TMDb's trending endpoint only returns ~20 items per
 * page, so we merge several sources (trending week x2 pages + popular movies +
 * popular TV) and de-duplicate. Trending items come first so "Trending" is
 * genuinely trending; popular titles backfill the depth. Cached per request.
 */
export const trending = cache(async (): Promise<MediaItem[]> => {
  if (!isTmdbConfigured) return MEDIA;

  const empty = { results: [] as any[] };
  const [tw1, tw2, popMovies, popTv] = await Promise.all([
    tmdb<{ results: any[] }>("/trending/all/week", { page: "1" }).catch(() => empty),
    tmdb<{ results: any[] }>("/trending/all/week", { page: "2" }).catch(() => empty),
    tmdb<{ results: any[] }>("/movie/popular", { page: "1" }).catch(() => empty),
    tmdb<{ results: any[] }>("/tv/popular", { page: "1" }).catch(() => empty),
  ]);

  const items: MediaItem[] = [];
  const seen = new Set<string>();
  const push = (r: any, type: "movie" | "tv") => {
    if (!r?.id) return;
    const key = `${type}_${r.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(mapMedia(r, type));
  };

  for (const r of tw1.results) if (r.media_type === "movie" || r.media_type === "tv") push(r, r.media_type);
  for (const r of tw2.results) if (r.media_type === "movie" || r.media_type === "tv") push(r, r.media_type);
  for (const r of popMovies.results) push(r, "movie");
  for (const r of popTv.results) push(r, "tv");

  // Drop entries with no poster so grids never show blank tiles.
  return items.filter((m) => m.poster_url);
});

export const DISCOVER_MAX_PAGES = 5;

/* Low-level helpers reused by the Watch Calendar data layer (server-only). */
export const tmdbGet = tmdb;
export const tmdbImg = img;
export const TMDB_GENRE_NAMES = GENRES;
export { mapMedia };

/**
 * A growing catalog for the Discover page. Fetches `pages` pages each of
 * trending-week + popular movies + popular TV and de-duplicates, so "Load more"
 * simply asks for one more page. Capped so it can't run away.
 */
export const discoverCatalog = cache(async (pages = 1): Promise<MediaItem[]> => {
  if (!isTmdbConfigured) return MEDIA;
  const p = Math.max(1, Math.min(pages, DISCOVER_MAX_PAGES));
  const empty = { results: [] as any[] };

  const reqs: Promise<{ results: any[] }>[] = [];
  for (let n = 1; n <= p; n++) {
    const page = String(n);
    reqs.push(tmdb<{ results: any[] }>("/trending/all/week", { page }).catch(() => empty));
    reqs.push(tmdb<{ results: any[] }>("/movie/popular", { page }).catch(() => empty));
    reqs.push(tmdb<{ results: any[] }>("/tv/popular", { page }).catch(() => empty));
  }
  const all = await Promise.all(reqs);

  const items: MediaItem[] = [];
  const seen = new Set<string>();
  const push = (r: any, type: "movie" | "tv") => {
    if (!r?.id) return;
    const key = `${type}_${r.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(mapMedia(r, type));
  };

  // Interleave page-by-page: trending, then popular movies, then popular TV.
  for (let i = 0; i < all.length; i += 3) {
    for (const r of all[i].results) if (r.media_type === "movie" || r.media_type === "tv") push(r, r.media_type);
    for (const r of all[i + 1].results) push(r, "movie");
    for (const r of all[i + 2].results) push(r, "tv");
  }
  return items.filter((m) => m.poster_url);
});

/* ------------------------------------------------------------------ genres */

/**
 * Browsable genres with their TMDb movie/tv genre ids (some are one-sided,
 * some carry more than one id). TMDb lumps a few genres together on the TV side
 * — "Action & Adventure" (10759), "Sci-Fi & Fantasy" (10765) and
 * "War & Politics" (10768) — with no way to separate them. Rather than show two
 * chips that return the same shows, those are merged into one "A / B" chip whose
 * label makes clear the results span both.
 */
export const GENRES_BROWSE: { name: string; movie?: number[]; tv?: number[] }[] = [
  { name: "Action / Adventure", movie: [28, 12], tv: [10759] },
  { name: "Animation", movie: [16], tv: [16] },
  { name: "Comedy", movie: [35], tv: [35] },
  { name: "Crime", movie: [80], tv: [80] },
  { name: "Documentary", movie: [99], tv: [99] },
  { name: "Drama", movie: [18], tv: [18] },
  { name: "Family", movie: [10751], tv: [10751] },
  { name: "History", movie: [36] },
  { name: "Horror", movie: [27] },
  { name: "Mystery", movie: [9648], tv: [9648] },
  { name: "Reality", tv: [10764] },
  { name: "Romance", movie: [10749] },
  { name: "Sci-Fi / Fantasy", movie: [878, 14], tv: [10765] },
  { name: "Thriller", movie: [53] },
  { name: "War / Politics", movie: [10752], tv: [10768] },
  { name: "Western", movie: [37], tv: [37] },
];

// TMDb's hard ceiling is page 500 — keep loading a genre until its titles run
// out (or that ceiling), rather than stopping early.
export const GENRE_MAX_PAGES = 500;

export type GenreType = "all" | "movie" | "tv";

/**
 * Surface the browsed genre first so the card's genre label matches the filter.
 * For a merged "A / B" genre, surfaces whichever side the title actually is.
 */
function genreFirst(item: MediaItem, genreName: string): MediaItem {
  const parts = genreName.split(" / ");
  const match = parts.find((p) => item.genres.includes(p));
  if (match) {
    item.genres = [match, ...item.genres.filter((g) => g !== match)];
  }
  return item;
}

/**
 * Titles in a genre, paginated. `type` decides which TMDb catalogs are queried
 * so that Movies / Shows views are each complete rather than filtered from a
 * merged popularity feed.
 */
export const discoverByGenre = cache(
  async (name: string, page = 1, type: GenreType = "all"): Promise<{ items: MediaItem[]; totalPages: number }> => {
    const def = GENRES_BROWSE.find((g) => g.name.toLowerCase() === name.toLowerCase());
    if (!def) return { items: [], totalPages: 1 };
    if (!isTmdbConfigured) {
      const parts = def.name.split(" / ");
      return {
        items: MEDIA.filter(
          (m) => parts.some((pt) => m.genres.includes(pt)) && (type === "all" || m.media_type === type),
        ),
        totalPages: 1,
      };
    }

    const p = String(Math.max(1, Math.min(page, GENRE_MAX_PAGES)));
    const empty = { results: [] as any[], total_pages: 1 };
    const wantMovie = type !== "tv" && !!def.movie?.length;
    const wantTv = type !== "movie" && !!def.tv?.length;
    const [mv, tv] = await Promise.all([
      wantMovie
        ? tmdb<{ results: any[]; total_pages: number }>("/discover/movie", {
            with_genres: def.movie!.join("|"),
            sort_by: "popularity.desc",
            page: p,
          }).catch(() => empty)
        : Promise.resolve(empty),
      wantTv
        ? tmdb<{ results: any[]; total_pages: number }>("/discover/tv", {
            with_genres: def.tv!.join("|"),
            sort_by: "popularity.desc",
            page: p,
          }).catch(() => empty)
        : Promise.resolve(empty),
    ]);

    const items: MediaItem[] = [];
    const seen = new Set<string>();
    const push = (r: any, t: "movie" | "tv") => {
      if (!r?.id) return;
      const key = `${t}_${r.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(genreFirst(mapMedia(r, t), def.name));
    };
    for (const r of mv.results) push(r, "movie");
    for (const r of tv.results) push(r, "tv");

    const totalPages = Math.min(GENRE_MAX_PAGES, Math.max(mv.total_pages ?? 1, tv.total_pages ?? 1));
    return { items: items.filter((m) => m.poster_url), totalPages };
  },
);

export interface GenrePreview {
  backdrop: string | null; // representative TMDb backdrop for the genre
  count: number; // real number of titles in the genre
}

/**
 * Hand-picked artwork for specific genre cards (a strong, clearly on-genre
 * title), overriding the auto-picked most-popular backdrop so it doesn't drift.
 */
const GENRE_PINNED: Record<string, { type: "movie" | "tv"; id: number }> = {
  "Action / Adventure": { type: "movie", id: 76341 }, // Mad Max: Fury Road
  Comedy: { type: "movie", id: 18785 }, // The Hangover
  Family: { type: "movie", id: 116149 }, // Paddington
};

/**
 * A representative backdrop image + real title count for every browse genre,
 * for the "Browse by Genre" cards. Images are TMDb-licensed art (same source
 * the rest of the app uses); counts are real TMDb totals.
 */
export const getGenrePreviews = cache(async (): Promise<Record<string, GenrePreview>> => {
  const out: Record<string, GenrePreview> = {};
  if (!isTmdbConfigured) {
    for (const g of GENRES_BROWSE) out[g.name] = { backdrop: null, count: 0 };
    return out;
  }

  await Promise.all(
    GENRES_BROWSE.map(async (g) => {
      try {
        const calls: Promise<{ results: any[]; total_results: number }>[] = [];
        if (g.movie?.length)
          calls.push(
            tmdb("/discover/movie", {
              with_genres: g.movie.join("|"),
              sort_by: "popularity.desc",
              "vote_count.gte": "150",
              page: "1",
            }),
          );
        if (g.tv?.length)
          calls.push(
            tmdb("/discover/tv", {
              with_genres: g.tv.join("|"),
              sort_by: "popularity.desc",
              "vote_count.gte": "150",
              page: "1",
            }),
          );
        const res = await Promise.all(calls);
        let count = 0;
        let backdrop: string | null = null;
        for (const r of res) {
          count += r.total_results ?? 0;
          if (!backdrop) {
            const hit = (r.results ?? []).find((x: any) => x.backdrop_path);
            if (hit) backdrop = img(hit.backdrop_path, "w780");
          }
        }

        // Hand-picked override for select genres.
        const pin = GENRE_PINNED[g.name];
        if (pin) {
          try {
            const d = await tmdb<{ backdrop_path: string | null }>(`/${pin.type}/${pin.id}`, {});
            const pinned = img(d.backdrop_path, "w780");
            if (pinned) backdrop = pinned;
          } catch {
            /* keep the auto-picked backdrop */
          }
        }

        out[g.name] = { backdrop, count };
      } catch {
        out[g.name] = { backdrop: null, count: 0 };
      }
    }),
  );
  return out;
});

/**
 * Search titles by text, restricted to a genre. Uses TMDb's /search endpoints
 * (which cover the whole catalog, not a popularity slice) and keeps only
 * results whose genre_ids include the browsed genre — so searching within a
 * genre finds any matching title, not just ones already loaded.
 */
export const searchInGenre = cache(
  async (
    name: string,
    query: string,
    page = 1,
    type: GenreType = "all",
  ): Promise<{ items: MediaItem[]; totalPages: number }> => {
    const def = GENRES_BROWSE.find((g) => g.name.toLowerCase() === name.toLowerCase());
    const q = query.trim();
    if (!def || !q) return { items: [], totalPages: 1 };
    if (!isTmdbConfigured) {
      const lq = q.toLowerCase();
      const parts = def.name.split(" / ");
      return {
        items: MEDIA.filter(
          (m) =>
            parts.some((pt) => m.genres.includes(pt)) &&
            m.title.toLowerCase().includes(lq) &&
            (type === "all" || m.media_type === type),
        ),
        totalPages: 1,
      };
    }

    const p = String(Math.max(1, Math.min(page, GENRE_MAX_PAGES)));
    const empty = { results: [] as any[], total_pages: 1 };
    const wantMovie = type !== "tv" && !!def.movie?.length;
    const wantTv = type !== "movie" && !!def.tv?.length;
    const [mv, tv] = await Promise.all([
      wantMovie
        ? tmdb<{ results: any[]; total_pages: number }>("/search/movie", {
            query: q,
            include_adult: "false",
            page: p,
          }).catch(() => empty)
        : Promise.resolve(empty),
      wantTv
        ? tmdb<{ results: any[]; total_pages: number }>("/search/tv", {
            query: q,
            include_adult: "false",
            page: p,
          }).catch(() => empty)
        : Promise.resolve(empty),
    ]);

    const items: MediaItem[] = [];
    const seen = new Set<string>();
    const push = (r: any, t: "movie" | "tv", genreIds?: number[]) => {
      if (!r?.id) return;
      const gids: number[] = r.genre_ids ?? [];
      if (genreIds && !genreIds.some((g) => gids.includes(g))) return; // keep only in-genre hits
      const key = `${t}_${r.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(genreFirst(mapMedia(r, t), def.name));
    };
    for (const r of mv.results) push(r, "movie", def.movie);
    for (const r of tv.results) push(r, "tv", def.tv);

    const totalPages = Math.min(GENRE_MAX_PAGES, Math.max(mv.total_pages ?? 1, tv.total_pages ?? 1));
    return { items: items.filter((m) => m.poster_url), totalPages };
  },
);

/**
 * Parse our internal id into a TMDb lookup. Accepts:
 *  - the public slug form "the-odyssey-movie-1339713" (and bare "movie-1339713")
 *  - the legacy form "tmdb_tv_1399" (older links/bookmarks still resolve)
 * Mock ids like "m_frontier" don't match and fall back to MEDIA_BY_ID.
 */
function parseId(id: string): { type: "movie" | "tv"; tmdbId: number } | null {
  const legacy = id.match(/^tmdb_(movie|tv)_(\d+)$/);
  if (legacy) return { type: legacy[1] as "movie" | "tv", tmdbId: Number(legacy[2]) };
  const slug = id.match(/(?:^|-)(movie|tv)-(\d+)$/);
  if (slug) return { type: slug[1] as "movie" | "tv", tmdbId: Number(slug[2]) };
  return null;
}

export async function getMedia(id: string): Promise<MediaItem | null> {
  const parsed = parseId(id);
  if (!parsed) return MEDIA_BY_ID[id] ?? null;
  const { type, tmdbId } = parsed;
  const append = type === "movie" ? "release_dates" : "content_ratings";
  const r = await tmdb<any>(`/${type}/${tmdbId}`, { append_to_response: append });
  const media = mapMedia(r, type);
  // Runtime (minutes) and US age certification, from the same detail call.
  media.runtime = type === "movie" ? r.runtime ?? null : r.episode_run_time?.[0] ?? null;
  if (type === "movie") {
    const us = (r.release_dates?.results ?? []).find((x: any) => x.iso_3166_1 === "US");
    media.certification = us?.release_dates?.find((d: any) => d.certification)?.certification || null;
  } else {
    const us = (r.content_ratings?.results ?? []).find((x: any) => x.iso_3166_1 === "US");
    media.certification = us?.rating || null;
  }
  return media;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_url: string | null;
}

/**
 * Top-billed cast for a title, with headshot URLs (w185). Falls back to an
 * empty list for the offline mock catalog or on any TMDb error, so the page
 * degrades gracefully to placeholder avatars.
 */
export async function getCredits(id: string, limit = 20): Promise<CastMember[]> {
  const parsed = parseId(id);
  if (!parsed) return [];
  const { type, tmdbId } = parsed;
  try {
    const r = await tmdb<{ cast?: any[] }>(`/${type}/${tmdbId}/credits`);
    return (r.cast ?? [])
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        name: c.name ?? c.original_name ?? "Unknown",
        character: c.character ?? c.roles?.[0]?.character ?? "",
        profile_url: img(c.profile_path, "w185"),
      }));
  } catch {
    return [];
  }
}

/**
 * "People also watch" — TMDb's behavior-based recommendations for a title
 * (stronger than /similar). Returns mapped MediaItems, deduped, poster-only.
 */
export async function getRecommendations(id: string, limit = 16): Promise<MediaItem[]> {
  const parsed = parseId(id);
  if (!parsed) return [];
  const { type, tmdbId } = parsed;
  try {
    const r = await tmdb<{ results?: any[] }>(`/${type}/${tmdbId}/recommendations`);
    const items: MediaItem[] = [];
    const seen = new Set<string>();
    for (const c of r.results ?? []) {
      const mt: "movie" | "tv" = c.media_type === "movie" || c.media_type === "tv" ? c.media_type : type;
      if (!c.poster_path) continue;
      const key = `${mt}_${c.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(mapMedia(c, mt));
      if (items.length >= limit) break;
    }
    return items;
  } catch {
    return [];
  }
}

export interface PersonDetail {
  id: number;
  name: string;
  biography: string;
  profile_url: string | null;
  known_for: string | null;
  birthday: string | null;
  place_of_birth: string | null;
}

const personId = (id: string): number => Number(String(id).match(/(\d+)$/)?.[1] ?? "");

/** Full details for a cast member (bio, headshot, department, birth info). */
export async function getPerson(id: string): Promise<PersonDetail | null> {
  const tmdbId = personId(id);
  if (!tmdbId) return null;
  try {
    const r = await tmdb<any>(`/person/${tmdbId}`);
    return {
      id: r.id,
      name: r.name ?? "Unknown",
      biography: r.biography ?? "",
      profile_url: img(r.profile_path, "w342"),
      known_for: r.known_for_department ?? null,
      birthday: r.birthday ?? null,
      place_of_birth: r.place_of_birth ?? null,
    };
  } catch {
    return null;
  }
}

/** Other movies & shows this person is in, most popular first (deduped). */
export async function getPersonCredits(id: string, limit = 16): Promise<MediaItem[]> {
  const tmdbId = personId(id);
  if (!tmdbId) return [];
  try {
    const r = await tmdb<{ cast?: any[] }>(`/person/${tmdbId}/combined_credits`);
    const sorted = (r.cast ?? [])
      .filter((c) => (c.media_type === "movie" || c.media_type === "tv") && c.poster_path)
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    const items: MediaItem[] = [];
    const seen = new Set<string>();
    for (const c of sorted) {
      const key = `${c.media_type}_${c.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(mapMedia(c, c.media_type));
      if (items.length >= limit) break;
    }
    return items;
  } catch {
    return [];
  }
}

export async function getSeasons(id: string): Promise<Season[]> {
  const parsed = parseId(id);
  if (!parsed) return SEASONS.filter((s) => s.media_id === id);
  if (parsed.type !== "tv") return [];
  const r = await tmdb<any>(`/tv/${parsed.tmdbId}`);
  return (r.seasons ?? [])
    .filter((s: any) => s.season_number > 0)
    .map((s: any) => ({
      id: `${id}_s${s.season_number}`,
      media_id: id,
      season_number: s.season_number,
      name: s.name,
      episode_count: s.episode_count,
      overview: s.overview,
    }));
}

export async function getEpisodes(id: string, season: number): Promise<Episode[]> {
  const parsed = parseId(id);
  if (!parsed) {
    const s = SEASONS.find((x) => x.media_id === id && x.season_number === season);
    return episodesFor(id, season, s?.episode_count ?? 8);
  }
  const r = await tmdb<any>(`/tv/${parsed.tmdbId}/season/${season}`);
  return (r.episodes ?? []).map((e: any) => ({
    id: `${id}_s${season}_e${e.episode_number}`,
    media_id: id,
    season_number: season,
    episode_number: e.episode_number,
    name: e.name,
    overview: e.overview ?? "",
    air_date: e.air_date ?? null,
    still_url: img(e.still_path, "w780"),
    runtime: e.runtime ?? null,
  }));
}

export async function getEpisode(
  id: string,
  season: number,
  episode: number,
): Promise<Episode | null> {
  const eps = await getEpisodes(id, season);
  return eps.find((e) => e.episode_number === episode) ?? null;
}

/** Total episode count for a show — used to compute real progress %. */
export async function getShowEpisodeCount(id: string): Promise<number | null> {
  const parsed = parseId(id);
  if (!parsed) {
    const total = SEASONS.filter((s) => s.media_id === id).reduce((a, s) => a + s.episode_count, 0);
    return total || null;
  }
  if (parsed.type !== "tv") return null;
  const r = await tmdb<{ number_of_episodes?: number }>(`/tv/${parsed.tmdbId}`);
  return r.number_of_episodes ?? null;
}
