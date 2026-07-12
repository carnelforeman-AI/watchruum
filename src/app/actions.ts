"use server";

import { createClient } from "@/lib/supabase/server";
import { detectLang } from "@/lib/detect-lang";
import { isSupportedLang } from "@/lib/lang";
import { GENRES } from "@/lib/genres";
import { notify } from "@/lib/notify/fanout";
import { routeId } from "@/lib/utils";
import type { MediaItem, SpoilerScope } from "@/lib/types";
import type { ReviewComment } from "@/lib/queries";

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

/** The acting user's display name + username, for notification copy/links. */
async function actorName(ctx: { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }): Promise<{ name: string; username: string }> {
  const { data } = await ctx.supabase!.from("profiles").select("username, display_name").eq("id", ctx.userId).maybeSingle();
  const p = data as { username?: string; display_name?: string } | null;
  return { name: p?.display_name ?? "Someone", username: p?.username ?? "" };
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

/** Fetch the reply thread under a review (oldest first), for lazy expand. */
export async function loadReviewComments(reviewId: string): Promise<ReviewComment[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("review_comments")
    .select("id, body, created_at, author:profiles(display_name, avatar_url)")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true })
    .limit(200);
  type Row = { id: string; body: string; created_at: string; author?: { display_name?: string; avatar_url?: string | null } };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    author_name: r.author?.display_name ?? "User",
    author_avatar: r.author?.avatar_url ?? null,
    body: r.body,
    created_at: r.created_at,
  }));
}

/**
 * Post a reply under a review. Notifies the review's author via the fan-out
 * (in-app + push). Returns the new row id so the client can reconcile.
 */
export async function postReviewComment(
  reviewId: string,
  body: string,
): Promise<Result & { id?: string }> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  if (BLOCK_COMMENT.has(await accountStatus(ctx.supabase, ctx.userId)))
    return { ok: false, error: "Your account can't reply right now." };
  const text = cleanText(body, 4000);
  if (!text) return { ok: false, error: "Reply is empty." };

  const { data, error } = await ctx.supabase
    .from("review_comments")
    .insert({ review_id: reviewId, user_id: ctx.userId, body: text })
    .select("id")
    .single();

  if (!error) {
    // Notify the review's author (skip self-replies).
    const { data: rev } = await ctx.supabase
      .from("reviews")
      .select("user_id, media:media_items(tmdb_id, media_type, title)")
      .eq("id", reviewId)
      .maybeSingle();
    const r = rev as
      | { user_id?: string; media?: { tmdb_id: number; media_type: "movie" | "tv"; title: string } }
      | null;
    if (r?.user_id && r.user_id !== ctx.userId) {
      const a = await actorName(ctx);
      const link = r.media
        ? `/title/${routeId(r.media.media_type, r.media.tmdb_id, r.media.title)}#reviews`
        : "/notifications";
      await notify(r.user_id, { type: "reply", message: `${a.name} replied to your review`, link });
    }
  }

  return { ok: !error, id: (data as { id: string } | null)?.id, error: error?.message };
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

/** Toggle whether friends can see the room you're currently in (presence). */
export async function setShowActivity(showActivity: boolean): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ show_activity: showActivity })
    .eq("id", ctx.userId);
  return { ok: !error, error: error?.message };
}

/** Update the viewer's favorite genres (validated against the known list). */
export async function setFavoriteGenres(genres: string[]): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const allowed = new Set<string>(GENRES);
  const clean = Array.from(new Set(genres)).filter((g) => allowed.has(g)).slice(0, 12);
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ favorite_genres: clean })
    .eq("id", ctx.userId);
  return { ok: !error, error: error?.message };
}

/** Persist the viewer's spoiler-safety level (strict | balanced | off). */
export async function setSpoilerSafety(level: string): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const v = level === "balanced" || level === "off" ? level : "strict";
  const { error } = await ctx.supabase.from("profiles").update({ spoiler_safety: v }).eq("id", ctx.userId);
  return { ok: !error, error: error?.message };
}

/** Persist the viewer's notification toggles. */
export async function setNotificationPrefs(prefs: {
  messages: boolean;
  replies: boolean;
  likes: boolean;
  releases: boolean;
  reminders: boolean;
  unlocks: boolean;
  trending: boolean;
}): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      notify_messages: !!prefs.messages,
      notify_replies: !!prefs.replies,
      notify_likes: !!prefs.likes,
      notify_releases: !!prefs.releases,
      notify_reminders: !!prefs.reminders,
      notify_unlocks: !!prefs.unlocks,
      notify_trending: !!prefs.trending,
    })
    .eq("id", ctx.userId);
  return { ok: !error, error: error?.message };
}

export interface MemberResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  genres: string[];
  followed: boolean;
}

/**
 * Live member search for the Find Friends page — matches display name or
 * @username, newest first. Empty query returns recent members. Marks who the
 * caller already follows. Input is sanitized before it hits the PostgREST
 * filter grammar.
 */
export async function searchMembers(query: string): Promise<MemberResult[]> {
  const ctx = await authed();
  if (!ctx) return [];
  const q = (query ?? "").replace(/[,().%*:\\"'`]/g, " ").replace(/[ -]/g, " ").trim().slice(0, 40);

  let sel = ctx.supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, favorite_genres, is_private")
    .neq("id", ctx.userId);
  if (q) sel = sel.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
  const { data } = await sel.order("created_at", { ascending: false }).limit(30);

  const rows = ((data as {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    favorite_genres: string[] | null;
    is_private: boolean | null;
  }[] | null) ?? []).filter((p) => p.username);

  const ids = rows.map((r) => r.id);
  const followed = new Set<string>();
  if (ids.length) {
    const { data: fol } = await ctx.supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", ctx.userId)
      .in("following_id", ids);
    for (const f of (fol as { following_id: string }[] | null) ?? []) followed.add(f.following_id);
  }

  return rows.map((p) => ({
    id: p.id,
    username: p.username as string,
    display_name: p.display_name ?? "Member",
    avatar_url: p.avatar_url ?? null,
    // Private members: only name + avatar are public.
    bio: p.is_private ? null : p.bio ?? null,
    genres: p.is_private ? [] : p.favorite_genres ?? [],
    followed: followed.has(p.id),
  }));
}

/**
 * Follow or unfollow another member. Writes to the `follows` table (RLS lets a
 * user manage only their own follow rows). Used by the Find Friends page.
 */
export async function toggleFollow(targetUserId: string, follow: boolean): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  if (!targetUserId || targetUserId === ctx.userId)
    return { ok: false, error: "You can't follow yourself." };
  if (follow) {
    const { error } = await ctx.supabase
      .from("follows")
      .insert({ follower_id: ctx.userId, following_id: targetUserId });
    if (!error) {
      const a = await actorName(ctx);
      await notify(targetUserId, {
        type: "follow",
        message: `${a.name} started following you`,
        link: a.username ? `/u/${a.username}` : "/friends",
      });
    }
    // Ignore duplicate-follow errors (already following).
    return { ok: !error || error.code === "23505", error: error?.code === "23505" ? undefined : error?.message };
  }
  const { error } = await ctx.supabase
    .from("follows")
    .delete()
    .eq("follower_id", ctx.userId)
    .eq("following_id", targetUserId);
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
    if (!error && (targetType === "review" || targetType === "comment")) {
      const table = targetType === "review" ? "reviews" : "comments";
      const { data: t } = await ctx.supabase.from(table).select("user_id").eq("id", targetId).maybeSingle();
      const authorId = (t as { user_id?: string } | null)?.user_id;
      if (authorId && authorId !== ctx.userId) {
        const a = await actorName(ctx);
        await notify(authorId, {
          type: "like",
          message: `${a.name} liked your ${targetType}`,
          link: a.username ? `/u/${a.username}` : "/notifications",
        });
      }
    }
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
