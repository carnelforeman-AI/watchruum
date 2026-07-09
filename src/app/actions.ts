"use server";

import { createClient } from "@/lib/supabase/server";
import type { MediaItem, SpoilerScope } from "@/lib/types";

/**
 * Server actions for the core flow. Each persists to Supabase when it's
 * configured and the user is signed in; otherwise it returns
 * { demo: true } so the client can keep local optimistic state.
 */

type Result = { ok: boolean; demo?: boolean; error?: string };

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
  return data?.id ?? null;
}

async function authed() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

/**
 * Read the caller's moderation status. Returns "active" if unknown or if the
 * status column isn't present yet (pre-migration).
 */
async function accountStatus(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
): Promise<string> {
  const { data } = await supabase.from("profiles").select("status").eq("id", userId).maybeSingle();
  return (data as { status?: string } | null)?.status ?? "active";
}

const BLOCK_COMMENT = new Set(["muted", "suspended", "banned"]);
const BLOCK_REVIEW = new Set(["muted", "limited", "suspended", "banned"]);

export async function toggleWatchlist(media: MediaItem, next: boolean): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  const { error } = await ctx.supabase
    .from("watch_status")
    .upsert(
      { user_id: ctx.userId, media_id: mediaId, in_watchlist: next },
      { onConflict: "user_id,media_id" },
    );
  return { ok: !error, error: error?.message };
}

export async function markEpisodeWatched(
  media: MediaItem,
  season: number,
  episode: number,
): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };

  await ctx.supabase.from("episode_watches").upsert(
    { user_id: ctx.userId, media_id: mediaId, season_number: season, episode_number: episode },
    { onConflict: "user_id,media_id,season_number,episode_number" },
  );
  // Advance progress pointer to the furthest watched episode.
  const { error } = await ctx.supabase.from("watch_status").upsert(
    { user_id: ctx.userId, media_id: mediaId, season_number: season, episode_number: episode },
    { onConflict: "user_id,media_id" },
  );
  return { ok: !error, error: error?.message };
}

export async function markMovieWatched(media: MediaItem, next: boolean): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  const { error } = await ctx.supabase.from("watch_status").upsert(
    { user_id: ctx.userId, media_id: mediaId, movie_watched: next },
    { onConflict: "user_id,media_id" },
  );
  return { ok: !error, error: error?.message };
}

export async function rate(
  media: MediaItem,
  score: number,
  season: number | null,
  episode: number | null,
): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  const { error } = await ctx.supabase.from("ratings").upsert(
    { user_id: ctx.userId, media_id: mediaId, season_number: season, episode_number: episode, score },
    { onConflict: "user_id,media_id,season_number,episode_number" },
  );
  return { ok: !error, error: error?.message };
}

export async function postComment(
  media: MediaItem,
  season: number | null,
  episode: number | null,
  body: string,
  spoiler_scope: SpoilerScope,
): Promise<Result & { id?: string }> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  if (BLOCK_COMMENT.has(await accountStatus(ctx.supabase, ctx.userId)))
    return { ok: false, error: "Your account can't post right now." };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  const { data, error } = await ctx.supabase
    .from("comments")
    .insert({
      user_id: ctx.userId,
      media_id: mediaId,
      season_number: season,
      episode_number: episode,
      body,
      spoiler_scope,
    })
    .select("id")
    .single();
  return { ok: !error, id: data?.id, error: error?.message };
}

export async function reportContent(
  targetType: "comment" | "review",
  targetId: string,
  reason: string,
): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const { error } = await ctx.supabase.from("reports").insert({
    reporter_id: ctx.userId,
    target_type: targetType,
    target_id: targetId,
    reason,
  });
  return { ok: !error, error: error?.message };
}

/** Write a review for a title / season / episode. */
export async function postReview(
  media: MediaItem,
  season: number | null,
  episode: number | null,
  score: number,
  body: string,
  spoiler_scope: SpoilerScope,
): Promise<Result & { id?: string }> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  if (BLOCK_REVIEW.has(await accountStatus(ctx.supabase, ctx.userId)))
    return { ok: false, error: "Your account can't post reviews right now." };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  const { data, error } = await ctx.supabase
    .from("reviews")
    .insert({
      user_id: ctx.userId,
      media_id: mediaId,
      season_number: season,
      episode_number: episode,
      score,
      body,
      spoiler_scope,
    })
    .select("id")
    .single();
  return { ok: !error, id: data?.id, error: error?.message };
}

/** Like / unlike a review (or comment). Counts are derived from reactions. */
export async function toggleReaction(
  targetType: "review" | "comment",
  targetId: string,
  liked: boolean,
): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  if (liked) {
    const { error } = await ctx.supabase
      .from("reactions")
      .upsert(
        { user_id: ctx.userId, target_type: targetType, target_id: targetId, emoji: "❤️" },
        { onConflict: "user_id,target_type,target_id,emoji" },
      );
    return { ok: !error, error: error?.message };
  }
  const { error } = await ctx.supabase
    .from("reactions")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  return { ok: !error, error: error?.message };
}
