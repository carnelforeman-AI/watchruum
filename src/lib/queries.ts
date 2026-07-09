import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { getShowEpisodeCount, trending } from "./tmdb";
import type { MediaItem, Room, Review, ActivityEvent, SpoilerScope } from "./types";
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

/* ------------------------------------------------------------------ reviews */

export interface DisplayReview {
  id: string;
  author_name: string;
  author_avatar: string | null;
  season_number: number | null;
  episode_number: number | null;
  score: number;
  body: string;
  spoiler_scope: SpoilerScope;
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
}

async function reactionCounts(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  ids: string[],
  userId: string | null,
) {
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  if (!ids.length) return { counts, mine };
  const { data } = await supabase
    .from("reactions")
    .select("target_id, user_id")
    .eq("target_type", "review")
    .in("target_id", ids);
  for (const r of (data ?? []) as any[]) {
    counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
    if (userId && r.user_id === userId) mine.add(r.target_id);
  }
  return { counts, mine };
}

/** Real reviews for a given TMDb title (newest first). */
export const getReviewsForMedia = cache(
  async (tmdbId: number, mediaType: "movie" | "tv"): Promise<DisplayReview[]> => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: media } = await supabase
      .from("media_items")
      .select("id")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();
    if (!media) return [];

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: rows } = await supabase
      .from("reviews")
      .select("id, season_number, episode_number, score, body, spoiler_scope, created_at, author:profiles(display_name, avatar_url)")
      .eq("media_id", media.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (rows ?? []) as any[];
    const { counts, mine } = await reactionCounts(supabase, list.map((r) => r.id), user?.id ?? null);

    return list.map((r) => ({
      id: r.id,
      author_name: r.author?.display_name ?? "User",
      author_avatar: r.author?.avatar_url ?? null,
      season_number: r.season_number,
      episode_number: r.episode_number,
      score: r.score ?? 0,
      body: r.body,
      spoiler_scope: r.spoiler_scope,
      like_count: counts.get(r.id) ?? 0,
      liked_by_me: mine.has(r.id),
      created_at: r.created_at,
    }));
  },
);

/** Recent spoiler-free reviews across the app, for the home feed. */
export const getPopularReviews = cache(async (limit = 2): Promise<Review[]> => {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: rows } = await supabase
    .from("reviews")
    .select("id, season_number, episode_number, score, body, spoiler_scope, created_at, author:profiles(username, display_name, avatar_url), media:media_items(id, tmdb_id, media_type, title)")
    .eq("spoiler_scope", "none")
    .order("created_at", { ascending: false })
    .limit(limit);

  const list = (rows ?? []) as any[];
  const { counts } = await reactionCounts(supabase, list.map((r) => r.id), null);

  return list
    .filter((r) => r.media)
    .map((r) => ({
      id: r.id,
      author: {
        id: "u",
        username: r.author?.username ?? "user",
        display_name: r.author?.display_name ?? "User",
        avatar_url: r.author?.avatar_url ?? null,
        bio: null,
        favorite_genres: [],
      },
      media: { id: `tmdb_${r.media.media_type}_${r.media.tmdb_id}`, title: r.media.title },
      season_number: r.season_number,
      episode_number: r.episode_number,
      score: r.score ?? 0,
      body: r.body,
      spoiler_scope: r.spoiler_scope,
      like_count: counts.get(r.id) ?? 0,
      comment_count: 0,
      created_at: r.created_at,
    }));
});

/* ------------------------------------------------------------------ rooms */

export interface RoomMessage {
  id: string;
  author: { id: string; username: string; display_name: string; avatar_url: string | null; is_admin: boolean };
  body: string;
  spoiler_scope: SpoilerScope;
  season_number: number | null;
  episode_number: number | null;
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
}

export interface RoomMember {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  online: boolean;
  message_count: number;
}

export interface RoomFeed {
  configured: boolean;
  viewerId: string | null;
  messages: RoomMessage[];
  members: RoomMember[];
  memberCount: number;
  onlineCount: number;
  progress: import("./spoiler").ViewerProgress | null;
  watchedThisEpisode: boolean;
  watchedEpisodes: number[]; // episode numbers watched in this season
  createdBy: { username: string; display_name: string } | null;
}

/**
 * Everything the episode room needs, from real Supabase data. The "room" is
 * keyed by (media, season, episode); a message belongs to it when its stored
 * season/episode match. Falls back to an empty (but valid) room when Supabase
 * isn't configured or nobody has posted yet.
 */
export const getRoomFeed = cache(
  async (
    tmdbId: number,
    mediaType: "movie" | "tv",
    season: number | null,
    episode: number | null,
  ): Promise<RoomFeed> => {
    const empty: RoomFeed = {
      configured: false,
      viewerId: null,
      messages: [],
      members: [],
      memberCount: 0,
      onlineCount: 0,
      progress: null,
      watchedThisEpisode: false,
      watchedEpisodes: [],
      createdBy: null,
    };

    const supabase = await createClient();
    if (!supabase) return empty;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const viewerId = user?.id ?? null;

    const { data: media } = await supabase
      .from("media_items")
      .select("id")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();

    const isMovie = mediaType === "movie";

    // Viewer progress + watched episodes in this season (needs the media row).
    let progress: import("./spoiler").ViewerProgress | null = null;
    let watchedEpisodes: number[] = [];
    if (viewerId && media) {
      const { data: ws } = await supabase
        .from("watch_status")
        .select("season_number, episode_number, movie_watched")
        .eq("user_id", viewerId)
        .eq("media_id", media.id)
        .maybeSingle();
      if (ws) {
        progress = {
          season_number: (ws as any).season_number,
          episode_number: (ws as any).episode_number,
          movie_watched: (ws as any).movie_watched ?? false,
        };
      }
      if (!isMovie && season != null) {
        const { data: ew } = await supabase
          .from("episode_watches")
          .select("episode_number")
          .eq("user_id", viewerId)
          .eq("media_id", media.id)
          .eq("season_number", season);
        watchedEpisodes = ((ew ?? []) as any[]).map((r) => r.episode_number).filter((n) => n != null);
      }
    }
    const watchedThisEpisode = isMovie
      ? !!progress?.movie_watched
      : episode != null && watchedEpisodes.includes(episode);

    if (!media) {
      return { ...empty, configured: true, viewerId, progress, watchedThisEpisode, watchedEpisodes };
    }

    // Messages posted in this room (this media + season + episode). Movies use
    // null season/episode, so match with `.is` in that case.
    let mq = supabase
      .from("comments")
      .select(
        "id, body, spoiler_scope, season_number, episode_number, created_at, author:profiles(id, username, display_name, avatar_url, is_admin)",
      )
      .eq("media_id", media.id);
    mq = season == null ? mq.is("season_number", null) : mq.eq("season_number", season);
    mq = episode == null ? mq.is("episode_number", null) : mq.eq("episode_number", episode);
    const { data: rows } = await mq.order("created_at", { ascending: true }).limit(200);

    const list = (rows ?? []) as any[];

    // Reaction counts for these comments.
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    if (list.length) {
      const { data: reacts } = await supabase
        .from("reactions")
        .select("target_id, user_id")
        .eq("target_type", "comment")
        .in(
          "target_id",
          list.map((r) => r.id),
        );
      for (const r of (reacts ?? []) as any[]) {
        counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
        if (viewerId && r.user_id === viewerId) mine.add(r.target_id);
      }
    }

    const messages: RoomMessage[] = list
      .filter((r) => r.author)
      .map((r) => ({
        id: r.id,
        author: {
          id: r.author.id,
          username: r.author.username ?? "member",
          display_name: r.author.display_name ?? "Member",
          avatar_url: r.author.avatar_url ?? null,
          is_admin: !!r.author.is_admin,
        },
        body: r.body,
        spoiler_scope: r.spoiler_scope,
        season_number: r.season_number,
        episode_number: r.episode_number,
        like_count: counts.get(r.id) ?? 0,
        liked_by_me: mine.has(r.id),
        created_at: r.created_at,
      }));

    // Members = distinct authors in this room (real participation).
    const memberMap = new Map<string, RoomMember>();
    for (const m of messages) {
      const prev = memberMap.get(m.author.id);
      if (prev) prev.message_count += 1;
      else
        memberMap.set(m.author.id, {
          ...m.author,
          online: false,
          message_count: 1,
        });
    }
    const members = [...memberMap.values()].sort((a, b) => b.message_count - a.message_count);
    // Mark the most recent posters as "online" (illustrative presence).
    const recent = new Set(messages.slice(-6).map((m) => m.author.id));
    for (const mem of members) mem.online = recent.has(mem.id);

    const createdBy = members[0] ? { username: members[0].username, display_name: members[0].display_name } : null;

    return {
      configured: true,
      viewerId,
      messages,
      members,
      memberCount: members.length,
      onlineCount: members.filter((m) => m.online).length,
      progress,
      watchedThisEpisode,
      watchedEpisodes,
      createdBy,
    };
  },
);

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
