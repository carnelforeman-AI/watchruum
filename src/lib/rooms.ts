import "server-only";
import { cache } from "react";
import { tmdbGet, trending } from "./tmdb";
import type { MediaItem } from "./types";
import type { WatchRoom, WatchRoomsData } from "./rooms-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Watch Rooms data layer. Titles, posters, ratings, networks and the "now
 * airing" episode all come from real TMDb data. The engagement metrics
 * (in-room, messages, engagement score) are a deterministic display value
 * seeded from the TMDb id — there is no live rooms backend yet, so they stay
 * stable across renders instead of flickering on every load.
 */

function seeded(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface TvDetail {
  networks?: { name: string }[];
  number_of_seasons?: number;
  last_episode_to_air?: { season_number?: number; episode_number?: number; name?: string };
}

const tvDetail = cache(async (tmdbId: number): Promise<TvDetail | null> => {
  try {
    return await tmdbGet<TvDetail>(`/tv/${tmdbId}`, {});
  } catch {
    return null;
  }
});

async function buildRoom(m: MediaItem, i: number): Promise<WatchRoom> {
  const rank = i + 1;
  const s = seeded(m.tmdb_id);

  let seasonNumber: number | null = null;
  let episodeNumber: number | null = null;
  let episodeTitle: string | null = null;
  let network: string | null = null;

  if (m.media_type === "tv") {
    const d = await tvDetail(m.tmdb_id);
    network = d?.networks?.[0]?.name ?? null;
    const ep = d?.last_episode_to_air;
    if (ep && ep.season_number != null && ep.episode_number != null) {
      seasonNumber = ep.season_number;
      episodeNumber = ep.episode_number;
      episodeTitle = ep.name || null;
    }
  }

  const inRoom = Math.max(110, Math.round((1300 - rank * 150) * (0.88 + s * 0.28)));
  const messages = Math.round(inRoom * (4.5 + s * 4));
  const engagement = Math.round(inRoom * (68 + s * 34));
  const engagementScore = Math.min(96, 72 + Math.round((1 - rank / 12) * 20) + Math.round(s * 4));
  const live = rank <= 4;

  const scopeLabel =
    m.media_type === "tv" && seasonNumber != null
      ? `S${seasonNumber} E${episodeNumber}${episodeTitle ? ` • "${episodeTitle}"` : ""}`
      : m.genres[0] ?? (m.media_type === "tv" ? "Series" : "Film");

  const seasonTag =
    m.media_type === "tv"
      ? seasonNumber != null
        ? `Season ${seasonNumber}`
        : "Series"
      : m.genres[0] ?? "Movie";

  return {
    id: m.id,
    media: m,
    rank,
    seasonNumber,
    episodeNumber,
    episodeTitle,
    scopeLabel,
    seasonTag,
    spoilerTag: m.media_type === "tv" ? "Episode Spoilers" : "Movie Spoilers",
    network,
    inRoom,
    messages,
    engagement,
    engagementScore,
    live,
    hot: !live,
  };
}

export const getWatchRooms = cache(async (limit = 12): Promise<WatchRoomsData> => {
  let items: MediaItem[] = [];
  try {
    items = await trending();
  } catch {
    items = [];
  }
  items = items.filter((m) => m.poster_url).slice(0, limit);

  const rooms = await Promise.all(items.map((m, i) => buildRoom(m, i)));

  const activeNow = rooms.reduce((a, r) => a + r.inRoom, 0);
  const trendingNow = rooms.slice(0, 5);
  const leaderboard = [...rooms].sort((a, b) => b.engagement - a.engagement).slice(0, 5);

  return { rooms, trendingNow, leaderboard, activeNow };
});
