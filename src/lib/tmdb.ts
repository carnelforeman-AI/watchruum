import "server-only";
import { cache } from "react";
import type { Episode, MediaItem, Season } from "./types";
import { MEDIA, MEDIA_BY_ID, SEASONS, episodesFor } from "./mock-data";

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
    id: `tmdb_${type}_${r.id}`,
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

/** Parse our internal id: either "tmdb_tv_1399" or a mock id "m_frontier". */
function parseId(id: string): { type: "movie" | "tv"; tmdbId: number } | null {
  const m = id.match(/^tmdb_(movie|tv)_(\d+)$/);
  if (!m) return null;
  return { type: m[1] as "movie" | "tv", tmdbId: Number(m[2]) };
}

export async function getMedia(id: string): Promise<MediaItem | null> {
  const parsed = parseId(id);
  if (!parsed) return MEDIA_BY_ID[id] ?? null;
  const { type, tmdbId } = parsed;
  const r = await tmdb<any>(`/${type}/${tmdbId}`);
  return mapMedia(r, type);
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
