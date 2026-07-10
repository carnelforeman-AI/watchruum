"use server";

import { createClient } from "@/lib/supabase/server";
import { loadCalendar, searchCalendar, getTrailerKey } from "@/lib/calendar";
import type { CalendarQuery } from "@/lib/calendar-constants";

/** One page of calendar results (tab + filters). */
export async function loadCalendarPage(q: CalendarQuery) {
  return loadCalendar(q);
}

/** Search upcoming titles by text. */
export async function searchCalendarAction(query: string, page = 1) {
  return searchCalendar(query, page);
}

/** Fetch a title's YouTube trailer key on demand. */
export async function getTrailer(tmdbId: number, mediaType: "movie" | "tv") {
  return getTrailerKey(tmdbId, mediaType);
}

export interface AlertPayload {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string | null;
  releaseDate: string | null;
  alertTypes?: string[];
  following?: boolean;
}

/** Notify Me / Follow toggle for an upcoming title (persists to title_alerts). */
export async function toggleTitleAlert(p: AlertPayload, on: boolean): Promise<{ ok: boolean; demo?: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: true, demo: true };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: true, demo: true };

  if (on) {
    const { error } = await supabase.from("title_alerts").upsert(
      {
        user_id: user.id,
        tmdb_id: p.tmdbId,
        media_type: p.mediaType,
        title: p.title,
        poster_url: p.poster,
        release_date: p.releaseDate,
        alert_types: p.alertTypes ?? ["release", "trailer", "room"],
        following: p.following ?? true,
      },
      { onConflict: "user_id,tmdb_id,media_type" },
    );
    return { ok: !error, error: error?.message };
  }
  const { error } = await supabase
    .from("title_alerts")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", p.tmdbId)
    .eq("media_type", p.mediaType);
  return { ok: !error, error: error?.message };
}

export interface MyAlertRow {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_url: string | null;
  release_date: string | null;
  alert_types: string[];
  following: boolean;
  created_at: string;
}

/** The signed-in user's tracked titles (for the My Alerts tab + rail). */
export async function getMyAlerts(): Promise<MyAlertRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("title_alerts")
    .select("tmdb_id, media_type, title, poster_url, release_date, alert_types, following, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data as MyAlertRow[] | null) ?? [];
}

/** Anonymous "fans waiting" counts keyed as `${media_type}_${tmdb_id}`. */
export async function getInterestMap(): Promise<Record<string, number>> {
  const supabase = await createClient();
  if (!supabase) return {};
  const { data } = await supabase.rpc("title_interest_counts");
  const map: Record<string, number> = {};
  for (const row of (data as { tmdb_id: number; media_type: string; fans: number }[] | null) ?? []) {
    map[`${row.media_type}_${row.tmdb_id}`] = Number(row.fans) || 0;
  }
  return map;
}
