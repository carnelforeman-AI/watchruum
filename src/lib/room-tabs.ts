import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { SpoilerScope } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TabAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface ThreadReply {
  id: string;
  body: string;
  created_at: string;
  author: TabAuthor;
}

export interface RoomThread {
  id: string;
  title: string;
  body: string;
  spoiler_scope: SpoilerScope;
  season_number: number | null;
  episode_number: number | null;
  created_at: string;
  author: TabAuthor;
  replies: ThreadReply[];
}

export interface RoomPoll {
  id: string;
  question: string;
  options: string[];
  created_at: string;
  author: TabAuthor;
  counts: number[]; // votes per option index
  totalVotes: number;
  myVote: number | null; // option index the viewer picked, or null
}

export interface RoomMediaItem {
  id: string;
  kind: string; // trailer | clip | image | meme | link
  url: string;
  caption: string | null;
  spoiler: boolean;
  created_at: string;
  author: TabAuthor;
}

const AUTHOR = "author:profiles(id, username, display_name, avatar_url)";

function normAuthor(a: any): TabAuthor {
  return {
    id: a?.id ?? "",
    username: a?.username ?? "member",
    display_name: a?.display_name ?? "Member",
    avatar_url: a?.avatar_url ?? null,
  };
}

/** Resolve the internal media_items uuid for a TMDb title, or null. */
async function resolveMediaId(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<string | null> {
  const { data } = await supabase
    .from("media_items")
    .select("id")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

function keyFilter(q: any, mediaId: string, season: number | null, episode: number | null) {
  q = q.eq("media_id", mediaId);
  q = season == null ? q.is("season_number", null) : q.eq("season_number", season);
  q = episode == null ? q.is("episode_number", null) : q.eq("episode_number", episode);
  return q;
}

/** Discussion threads (with replies) for a room. */
export const getRoomThreads = cache(
  async (
    tmdbId: number,
    mediaType: "movie" | "tv",
    season: number | null,
    episode: number | null,
  ): Promise<RoomThread[]> => {
    const supabase = await createClient();
    if (!supabase) return [];
    const mediaId = await resolveMediaId(supabase, tmdbId, mediaType);
    if (!mediaId) return [];

    const { data } = await keyFilter(
      supabase
        .from("room_threads")
        .select(`id, title, body, spoiler_scope, season_number, episode_number, created_at, ${AUTHOR}, replies:room_thread_replies(id, body, created_at, ${AUTHOR})`),
      mediaId,
      season,
      episode,
    ).order("created_at", { ascending: false });

    return ((data as any[]) ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      body: t.body,
      spoiler_scope: t.spoiler_scope,
      season_number: t.season_number,
      episode_number: t.episode_number,
      created_at: t.created_at,
      author: normAuthor(t.author),
      replies: ((t.replies as any[]) ?? [])
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((r) => ({ id: r.id, body: r.body, created_at: r.created_at, author: normAuthor(r.author) })),
    }));
  },
);

/** Polls for a room, with tallies and the viewer's vote. */
export const getRoomPolls = cache(
  async (
    tmdbId: number,
    mediaType: "movie" | "tv",
    season: number | null,
    episode: number | null,
  ): Promise<RoomPoll[]> => {
    const supabase = await createClient();
    if (!supabase) return [];
    const mediaId = await resolveMediaId(supabase, tmdbId, mediaType);
    if (!mediaId) return [];
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await keyFilter(
      supabase
        .from("room_polls")
        .select(`id, question, options, created_at, ${AUTHOR}, votes:room_poll_votes(user_id, option_index)`),
      mediaId,
      season,
      episode,
    ).order("created_at", { ascending: false });

    return ((data as any[]) ?? []).map((p) => {
      const options: string[] = p.options ?? [];
      const counts = new Array(options.length).fill(0);
      let myVote: number | null = null;
      for (const v of (p.votes as any[]) ?? []) {
        if (v.option_index >= 0 && v.option_index < counts.length) counts[v.option_index]++;
        if (user && v.user_id === user.id) myVote = v.option_index;
      }
      return {
        id: p.id,
        question: p.question,
        options,
        created_at: p.created_at,
        author: normAuthor(p.author),
        counts,
        totalVotes: counts.reduce((a: number, b: number) => a + b, 0),
        myVote,
      };
    });
  },
);

/** Approved media for a room. */
export const getRoomMedia = cache(
  async (
    tmdbId: number,
    mediaType: "movie" | "tv",
    season: number | null,
    episode: number | null,
  ): Promise<RoomMediaItem[]> => {
    const supabase = await createClient();
    if (!supabase) return [];
    const mediaId = await resolveMediaId(supabase, tmdbId, mediaType);
    if (!mediaId) return [];

    const { data } = await keyFilter(
      supabase.from("room_media").select(`id, kind, url, caption, spoiler, created_at, ${AUTHOR}`),
      mediaId,
      season,
      episode,
    ).order("created_at", { ascending: false });

    return ((data as any[]) ?? []).map((m) => ({
      id: m.id,
      kind: m.kind ?? "link",
      url: m.url,
      caption: m.caption ?? null,
      spoiler: !!m.spoiler,
      created_at: m.created_at,
      author: normAuthor(m.author),
    }));
  },
);
