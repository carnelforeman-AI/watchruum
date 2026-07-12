import "server-only";
import { createClient } from "./supabase/server";
import type { MediaItem, MediaType } from "./types";

/**
 * Real, database-backed counts used when Live Mode is ON. Every value here is a
 * true count of rows — each real action (a track, a post) = +1, starting at 0.
 * All helpers degrade to 0 / empty when Supabase isn't configured or a title
 * has no matching row yet, so callers never break.
 */

/** People tracking a title = rows in watch_status for it (each add = +1). */
export async function getTrackingCount(
  tmdbId: number,
  mediaType: MediaType,
): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;
  try {
    const { data: mi } = await supabase
      .from("media_items")
      .select("id")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();
    const mediaId = (mi as { id?: string } | null)?.id;
    if (!mediaId) return 0;
    const { count } = await supabase
      .from("watch_status")
      .select("id", { count: "exact", head: true })
      .eq("media_id", mediaId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export interface RoomActivity {
  /** Real posts in the room (comments across all its episodes). */
  messages: number;
  /** Distinct people who have posted in the room. */
  members: number;
  /** Posts in the last 30 minutes — drives the "LIVE NOW" badge. */
  recent: number;
}

/**
 * Real activity for a batch of titles, keyed by `${media_type}_${tmdb_id}`.
 * Resolves the titles to their media_items rows, then counts real comments
 * (posts) and distinct authors per title in a couple of bulk queries.
 */
export async function getRoomActivity(
  items: Pick<MediaItem, "tmdb_id" | "media_type">[],
): Promise<Map<string, RoomActivity>> {
  const key = (mt: string, id: number) => `${mt}_${id}`;
  const out = new Map<string, RoomActivity>();
  if (items.length === 0) return out;

  const supabase = await createClient();
  if (!supabase) return out;

  try {
    const tmdbIds = [...new Set(items.map((m) => m.tmdb_id))];
    const { data: media } = await supabase
      .from("media_items")
      .select("id, tmdb_id, media_type")
      .in("tmdb_id", tmdbIds);

    const rows = (media as { id: string; tmdb_id: number; media_type: string }[] | null) ?? [];
    if (rows.length === 0) return out;

    // media_items.id -> `${media_type}_${tmdb_id}`
    const mediaKeyById = new Map<string, string>();
    for (const r of rows) mediaKeyById.set(r.id, key(r.media_type, r.tmdb_id));

    const { data: comments } = await supabase
      .from("comments")
      .select("media_id, user_id, created_at")
      .in(
        "media_id",
        rows.map((r) => r.id),
      );

    const recentCutoff = Date.now() - 30 * 60_000; // "live" = posted in the last 30 min
    const authorsByKey = new Map<string, Set<string>>();
    const msgByKey = new Map<string, number>();
    const recentByKey = new Map<string, number>();
    for (const c of (comments as { media_id: string; user_id: string; created_at: string }[] | null) ?? []) {
      const k = mediaKeyById.get(c.media_id);
      if (!k) continue;
      msgByKey.set(k, (msgByKey.get(k) ?? 0) + 1);
      const set = authorsByKey.get(k) ?? new Set<string>();
      set.add(c.user_id);
      authorsByKey.set(k, set);
      if (c.created_at && new Date(c.created_at).getTime() >= recentCutoff) {
        recentByKey.set(k, (recentByKey.get(k) ?? 0) + 1);
      }
    }

    for (const k of mediaKeyById.values()) {
      out.set(k, {
        messages: msgByKey.get(k) ?? 0,
        members: authorsByKey.get(k)?.size ?? 0,
        recent: recentByKey.get(k) ?? 0,
      });
    }
    return out;
  } catch {
    return out;
  }
}
