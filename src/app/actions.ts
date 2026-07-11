"use server";

import { createClient } from "@/lib/supabase/server";
import { detectLang } from "@/lib/detect-lang";
import { isSupportedLang } from "@/lib/lang";
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

/** Trim and hard-cap free text before it's stored. Content is rendered escaped
 * by React, so this is abuse-prevention (length), not XSS sanitization. */
function cleanText(input: string, max: number): string {
  return (input ?? "").trim().slice(0, max);
}

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
  const text = cleanText(body, 4000);
  if (!text) return { ok: false, error: "Message is empty." };
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  const { data, error } = await ctx.supabase
    .from("comments")
    .insert({
      user_id: ctx.userId,
      media_id: mediaId,
      season_number: season,
      episode_number: episode,
      body: text,
      spoiler_scope,
      lang: detectLang(text),
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
  if (!ctx) return { ok: false, error: "Sign in to report content." };
  // Only real (persisted) content has a UUID id — reject sample/optimistic ids
  // so a report can never silently no-op.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(targetId)) return { ok: false, error: "This item can't be reported yet." };
  const { error } = await ctx.supabase.from("reports").insert({
    reporter_id: ctx.userId,
    target_type: targetType,
    target_id: targetId,
    reason: cleanText(reason, 500) || "Reported",
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
  image_urls: string[] = [],
): Promise<Result & { id?: string }> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  if (BLOCK_REVIEW.has(await accountStatus(ctx.supabase, ctx.userId)))
    return { ok: false, error: "Your account can't post reviews right now." };
  const text = cleanText(body, 8000);
  const mediaId = await ensureMedia(ctx.supabase, media);
  if (!mediaId) return { ok: false, error: "media" };
  // Keep only our own public storage URLs, cap at 4.
  const images = (image_urls ?? [])
    .filter((u) => typeof u === "string" && u.includes("/review-images/"))
    .slice(0, 4);
  const { data, error } = await ctx.supabase
    .from("reviews")
    .insert({
      user_id: ctx.userId,
      media_id: mediaId,
      season_number: season,
      episode_number: episode,
      score: Math.max(1, Math.min(10, Math.round(score))),
      body: text,
      spoiler_scope,
      image_urls: images,
      lang: detectLang(text),
    })
    .select("id")
    .single();
  return { ok: !error, id: data?.id, error: error?.message };
}

/** Save a new avatar URL (uploaded to Supabase Storage) on the caller's profile. */
export async function updateAvatar(avatarUrl: string): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: false, error: "Sign in to update your photo." };
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl || null })
    .eq("id", ctx.userId);
  return { ok: !error, error: error?.message };
}

/** Toggle the caller's profile privacy. When private, others see a minimal card. */
export async function setProfilePrivacy(isPrivate: boolean): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ is_private: isPrivate })
    .eq("id", ctx.userId);
  return { ok: !error, error: error?.message };
}

/**
 * Save the caller's preferred language. Posts/comments/reviews in other
 * languages are then auto-translated for them. `null` clears the preference
 * (falls back to the browser language).
 */
export async function setPreferredLanguage(code: string | null): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const value = code && isSupportedLang(code) ? code : null;
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ preferred_language: value })
    .eq("id", ctx.userId);
  return { ok: !error, error: error?.message };
}

/** Like / unlike a review (or comment). Counts are derived from reactions. */
export async function postPersonComment(
  personTmdbId: number,
  personName: string,
  body: string,
  hasSpoiler: boolean,
  image_urls: string[] = [],
): Promise<Result & { id?: string }> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  if (BLOCK_COMMENT.has(await accountStatus(ctx.supabase, ctx.userId)))
    return { ok: false, error: "Your account can't post right now." };
  const text = cleanText(body, 4000);
  if (!text) return { ok: false, error: "Message is empty." };
  if (!Number.isFinite(personTmdbId) || personTmdbId <= 0)
    return { ok: false, error: "Unknown person." };
  const images = (image_urls ?? [])
    .filter((u) => typeof u === "string" && u.includes("/review-images/"))
    .slice(0, 4);
  const { data, error } = await ctx.supabase
    .from("person_comments")
    .insert({
      user_id: ctx.userId,
      person_tmdb_id: personTmdbId,
      person_name: cleanText(personName, 200) || null,
      body: text,
      has_spoiler: !!hasSpoiler,
      image_urls: images,
      lang: detectLang(text),
    })
    .select("id")
    .single();
  return { ok: !error, id: data?.id, error: error?.message };
}

export async function toggleReaction(
  targetType: "review" | "comment" | "person_comment",
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
