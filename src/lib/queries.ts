import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { getShowEpisodeCount, trending } from "./tmdb";
import type { MediaItem, Room } from "./types";

/**
 * Real "Trending Watch Rooms" built from live TMDb trending titles.
 * Posters, titles and ratings are real; the active-user counts are a
 * deterministic display value (there is no rooms table yet). Falls back
 * gracefully if TMDb is unavailable.
 */
export const getTrendingRooms = cache(async (limit = 6): Promise<Room[]> => {
  let items: MediaItem[] = [];
  try {
    items = await trending();
  } catch {
    items = [];
  }
  return items.slice(0, limit).map((m, i) => ({
    id: m.id,
    media: m,
    scope_label:
      [m.release_year, m.genres[0]].filter(Boolean).join(" · ") ||
      (m.media_type === "tv" ? "Series" : "Movie"),
    season_number: null,
    episode_number: null,
    active_users: Math.max(120, 1900 - i * 240 + (m.tmdb_id % 80)),
    is_hot: i === 0,
  }));
});

/**
 * Server-side reads of the signed-in user's real library.
 * Returns null when Supabase isn't configured or nobody is signed in —
 * callers then fall back to sample data (logged-out marketing view).
 * Wrapped in React cache() so layout + page share one fetch per request.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function rowToMedia(m: any): MediaItem {
  return {
    // Route ids use the tmdb-style form so /title/[id] resolves via TMDb.
    id: `tmdb_${m.media_type}_${m.tmdb_id}`,
    tmdb_id: m.tmdb_id,
    media_type: m.media_type,
    title: m.title,
    overview: m.overview ?? "",
    poster_url: m.poster_url ?? null,
    backdrop_url: m.backdrop_url ?? null,
    release_year: m.release_year ?? null,
    genres: m.genres ?? [],
    vote_average: Number(m.vote_average ?? 0),
    number_of_seasons: m.number_of_seasons ?? undefined,
  };
}

export interface LibraryItem {
  media: MediaItem;
  season_number: number | null;
  episode_number: number | null;
  label: string;
  percent: number;
}

export interface UserLibrary {
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null;
  continueWatching: LibraryItem[];
  watchlist: MediaItem[];
  furthest: LibraryItem | null;
}

export const getUserLibrary = cache(async (): Promise<UserLibrary | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: rows }, { data: watches }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url, is_admin").eq("id", user.id).maybeSingle(),
    supabase
      .from("watch_status")
      .select("season_number, episode_number, movie_watched, in_watchlist, updated_at, media:media_items(*)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase.from("episode_watches").select("media_id").eq("user_id", user.id),
  ]);

  const watchedCount = new Map<string, number>();
  for (const w of watches ?? []) {
    // episode_watches.media_id is the DB uuid; count per media row
    watchedCount.set(w.media_id as string, (watchedCount.get(w.media_id as string) ?? 0) + 1);
  }

  const continueWatching: LibraryItem[] = [];
  const watchlist: MediaItem[] = [];

  for (const r of (rows ?? []) as any[]) {
    if (!r.media) continue;
    const media = rowToMedia(r.media);
    if (r.in_watchlist) watchlist.push(media);

    const inProgress = r.episode_number != null || r.movie_watched;
    if (!inProgress) continue;

    let percent = 0;
    if (media.media_type === "movie") {
      percent = r.movie_watched ? 100 : 0;
    } else {
      const total = await getShowEpisodeCount(media.id).catch(() => null);
      const c = watchedCount.get(r.media.id) ?? 0;
      percent = total ? Math.min(100, Math.round((c / total) * 100)) : Math.min(95, c * 8);
    }

    continueWatching.push({
      media,
      season_number: r.season_number,
      episode_number: r.episode_number,
      label:
        r.episode_number != null
          ? `S${r.season_number} · E${r.episode_number}`
          : media.media_type === "movie"
            ? "Movie"
            : "Started",
      percent,
    });
  }

  return {
    profile: profile ?? null,
    continueWatching,
    watchlist,
    furthest: continueWatching[0] ?? null,
  };
});
