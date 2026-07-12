"use server";

import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify/fanout";
import { routeId } from "@/lib/utils";
import type { MediaItem, SpoilerScope } from "@/lib/types";

/**
 * Server actions for the room activity tabs (Discussion, Polls, Media).
 * Each persists to Supabase when configured and the user is signed in;
 * otherwise it returns { demo: true } so the client keeps optimistic state.
 */

type Result = { ok: boolean; demo?: boolean; error?: string; id?: string };

async function authed() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

/** Ensure a TMDb title exists in media_items; returns the internal uuid. */
async function ensureMedia(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  media: MediaItem,
): Promise<string | null> {
  const { data } = await supabase
    .from("media_items")
    .upsert(
      {
        tmdb_id: media.tmdb_id,
        media_type: media.media_type,
        title: media.title,
        overview: media.overview,
        poster_url: media.poster_url,
        backdrop_url: media.backdrop_url,
        release_year: media.release_year,
        genres: media.genres,
        vote_average: media.vote_average,
        number_of_seasons: media.number_of_seasons ?? null,
      },
      { onConflict: "tmdb_id,media_type" },
    )
    .select("id")
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

const clean = (s: string, max: number) => s.trim().slice(0, max);

/* ------------------------------------------------------------ Discussion */

export async function createThread(
  media: MediaItem,
  season: number | null,
  episode: number | null,
  title: string,
  body: string,
  spoiler_scope: SpoilerScope,
): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const t = clean(title, 160);
  const b = clean(body, 6000);
  if (!t || !b) return { ok: false, error: "Add a title and some detail." };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  const { data, error } = await ctx.supabase
    .from("room_threads")
    .insert({ user_id: ctx.userId, media_id: mediaId, season_number: season, episode_number: episode, title: t, body: b, spoiler_scope })
    .select("id")
    .single();
  return { ok: !error, id: (data as { id: string } | null)?.id, error: error?.message };
}

export async function postThreadReply(threadId: string, body: string): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const b = clean(body, 4000);
  if (!b) return { ok: false, error: "Reply is empty." };
  const { data, error } = await ctx.supabase
    .from("room_thread_replies")
    .insert({ thread_id: threadId, user_id: ctx.userId, body: b })
    .select("id")
    .single();

  if (!error) {
    // Notify the thread's author (fan-out → in-app + push).
    const { data: thread } = await ctx.supabase
      .from("room_threads")
      .select("user_id, title, media:media_items(tmdb_id, media_type, title)")
      .eq("id", threadId)
      .maybeSingle();
    const t = thread as { user_id?: string; title?: string; media?: { tmdb_id: number; media_type: "movie" | "tv"; title: string } } | null;
    if (t?.user_id && t.user_id !== ctx.userId) {
      const { data: me } = await ctx.supabase.from("profiles").select("display_name").eq("id", ctx.userId).maybeSingle();
      const name = (me as { display_name?: string } | null)?.display_name ?? "Someone";
      const link = t.media ? `/title/${routeId(t.media.media_type, t.media.tmdb_id, t.media.title)}#rooms` : "/notifications";
      await notify(t.user_id, { type: "reply", message: `${name} replied to your thread “${t.title ?? "discussion"}”`, link });
    }
  }

  return { ok: !error, id: (data as { id: string } | null)?.id, error: error?.message };
}

/* ------------------------------------------------------------ Polls */

export async function createPoll(
  media: MediaItem,
  season: number | null,
  episode: number | null,
  question: string,
  options: string[],
): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const q = clean(question, 200);
  const opts = options.map((o) => clean(o, 80)).filter(Boolean);
  if (!q) return { ok: false, error: "Add a question." };
  if (opts.length < 2) return { ok: false, error: "Add at least two options." };
  if (opts.length > 6) return { ok: false, error: "Six options max." };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  const { data, error } = await ctx.supabase
    .from("room_polls")
    .insert({ user_id: ctx.userId, media_id: mediaId, season_number: season, episode_number: episode, question: q, options: opts })
    .select("id")
    .single();
  return { ok: !error, id: (data as { id: string } | null)?.id, error: error?.message };
}

export async function votePoll(pollId: string, optionIndex: number): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const { error } = await ctx.supabase
    .from("room_poll_votes")
    .upsert({ poll_id: pollId, user_id: ctx.userId, option_index: optionIndex }, { onConflict: "poll_id,user_id" });
  return { ok: !error, error: error?.message };
}

/* ------------------------------------------------------------ Media */

const MEDIA_KINDS = new Set(["trailer", "clip", "image", "meme", "link"]);

export async function addRoomMedia(
  media: MediaItem,
  season: number | null,
  episode: number | null,
  kind: string,
  url: string,
  caption: string | null,
  spoiler: boolean,
): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const k = MEDIA_KINDS.has(kind) ? kind : "link";
  const u = clean(url, 4000);
  // Links must look like http(s) or a data: image URL (uploaded photos).
  const isImageData = u.startsWith("data:image/");
  const isHttp = /^https?:\/\//i.test(u);
  if (!u || (!isHttp && !isImageData)) return { ok: false, error: "Add a valid link or image." };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  const { data, error } = await ctx.supabase
    .from("room_media")
    .insert({
      user_id: ctx.userId,
      media_id: mediaId,
      season_number: season,
      episode_number: episode,
      kind: k,
      url: u,
      caption: caption ? clean(caption, 240) : null,
      spoiler,
    })
    .select("id")
    .single();
  return { ok: !error, id: (data as { id: string } | null)?.id, error: error?.message };
}
