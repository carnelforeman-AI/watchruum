import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { getShowEpisodeCount, trending } from "./tmdb";
import type { MediaItem, Room, Review, ActivityEvent } from "./types";
import { type DiscussionCard, PROFILES } from "./mock-data";

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
 * Sample dashboard content for the whole app, built from real TMDb titles so
 * no fictional placeholder titles appear anywhere. Demo social copy (names,
 * reactions) is kept, but every show/movie referenced is a real title.
 */
const DEMO_LINES = ["That ending broke me.", "A perfect opener!", "Nobody saw that coming.", "The tension was unreal."];
const DEMO_PARTICIPANTS = [
  ["Sarah Kim", "Mike Boone", "Jess Rivera", "Tom Hale", "Maya Diaz"],
  ["Jess Rivera", "Maya Diaz", "Mike Boone"],
  ["Drew Park", "Tom Hale", "Sarah Kim"],
  ["Mike Boone", "Drew Park"],
];

function ago(hours: number) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

function scope(m: MediaItem, i: number) {
  return m.media_type === "tv" ? `S1 E${(i % 8) + 1}` : m.genres[0] ?? "Film";
}

export interface SampleContent {
  continueWatching: LibraryItem[];
  watchlist: MediaItem[];
  progress: LibraryItem[];
  discussions: DiscussionCard[];
  reviews: Review[];
  friendActivity: ActivityEvent[];
  notifications: { type: string; text: string; time: string; unread: boolean }[];
  safeUpTo: string | null;
}

export const getSampleContent = cache(async (): Promise<SampleContent> => {
  let items: MediaItem[] = [];
  try {
    items = await trending();
  } catch {
    items = [];
  }
  const pick = (i: number) => items[i % Math.max(1, items.length)];

  const continueWatching: LibraryItem[] = items.slice(6, 9).map((m, i) => ({
    media: m,
    season_number: m.media_type === "tv" ? 1 : null,
    episode_number: m.media_type === "tv" ? (i % 6) + 1 : null,
    label:
      m.media_type === "tv"
        ? `S1 · E${(i % 6) + 1}`
        : [m.release_year, m.genres[0]].filter(Boolean).join(" · ") || "Movie",
    percent: [68, 42, 81][i] ?? 55,
  }));

  const watchlist: MediaItem[] = items.slice(9, 14);

  const discussions: DiscussionCard[] = items.slice(14, 18).map((m, i) => ({
    id: `sd${i}`,
    media: m,
    scope: scope(m, i),
    title: DEMO_LINES[i] ?? "Loved this one.",
    comment_count: [1200, 842, 611, 503][i] ?? 300,
    participants: DEMO_PARTICIPANTS[i] ?? ["Sarah Kim", "Mike Boone"],
    created_at: ago([2, 5, 3, 1][i] ?? 4),
  }));

  const REVIEWERS = [PROFILES.maya, PROFILES.drew];
  const REVIEW_BODIES = [
    "This one was everything — the emotional weight, the performances, the silence. A masterpiece.",
    "The world-building here was insane. Can't wait to see where this goes next.",
  ];
  const reviews: Review[] = items.slice(0, 2).map((m, i) => ({
    id: `sr${i}`,
    author: REVIEWERS[i],
    media: { id: m.id, title: m.title },
    season_number: m.media_type === "tv" ? 1 : null,
    episode_number: m.media_type === "tv" ? (i % 6) + 1 : null,
    score: [9.5, 8.7][i] ?? 8,
    body: REVIEW_BODIES[i] ?? "Really enjoyed this.",
    spoiler_scope: "none",
    like_count: [120, 98][i] ?? 40,
    comment_count: [34, 21][i] ?? 10,
    created_at: ago([6, 8][i] ?? 7),
  }));

  const ACTORS = [PROFILES.sarah, PROFILES.mike, PROFILES.jess, PROFILES.tom];
  const VERBS: ActivityEvent["verb"][] = ["joined the room", "rated", "reviewed", "joined the room"];
  const friendActivity: ActivityEvent[] = items.slice(0, 4).map((m, i) => ({
    id: `sa${i}`,
    actor: ACTORS[i],
    verb: VERBS[i],
    target: `${m.title} ${scope(m, i)}`,
    score: VERBS[i] === "rated" ? 8 : undefined,
    created_at: ago([0.03, 0.25, 1, 2][i] ?? 3),
  }));

  const notifications = [
    { type: "reply", text: `Sarah Kim replied to your post in ${pick(0)?.title ?? "a room"} ${scope(pick(0) ?? items[0], 0)}`, time: "2m ago", unread: true },
    { type: "like", text: `Mike Boone liked your review of ${pick(1)?.title ?? "a title"} ${scope(pick(1) ?? items[0], 1)}`, time: "18m ago", unread: true },
    { type: "unlock", text: `Spoiler-safe discussion unlocked for ${pick(2)?.title ?? "a show"} ${scope(pick(2) ?? items[0], 2)}`, time: "1h ago", unread: true },
    { type: "follow", text: "Jess Rivera started following you", time: "3h ago", unread: false },
    { type: "episode", text: `New episode room active: ${pick(3)?.title ?? "a show"} ${scope(pick(3) ?? items[0], 3)}`, time: "5h ago", unread: false },
    { type: "trending", text: `${pick(4)?.title ?? "A show"} ${scope(pick(4) ?? items[0], 4)} is trending — fans are discussing`, time: "8h ago", unread: false },
  ];

  return {
    continueWatching,
    watchlist,
    progress: continueWatching,
    discussions,
    reviews,
    friendActivity,
    notifications,
    safeUpTo: continueWatching[0]
      ? `${continueWatching[0].media.title} ${continueWatching[0].label.replace(" · ", " ")}`
      : null,
  };
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
