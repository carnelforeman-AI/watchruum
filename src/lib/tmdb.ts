import "server-only";
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

export async function trending(): Promise<MediaItem[]> {
  if (!isTmdbConfigured) return MEDIA;
  const data = await tmdb<{ results: any[] }>("/trending/all/week");
  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => mapMedia(r, r.media_type));
}

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
