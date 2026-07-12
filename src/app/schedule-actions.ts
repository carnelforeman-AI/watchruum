"use server";

import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify/fanout";

/**
 * Server actions for scheduling watches (solo or as a watch party) and for
 * registering Web Push device subscriptions.
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

export async function scheduleWatch(input: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  scheduledAt: string; // ISO
  note: string | null;
  inviteeIds: string[];
}): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };

  const when = new Date(input.scheduledAt);
  if (isNaN(when.getTime())) return { ok: false, error: "Pick a valid date and time." };
  if (!input.title?.trim()) return { ok: false, error: "Missing title." };
  const mediaType = input.mediaType === "tv" ? "tv" : "movie";
  const invitees = Array.from(new Set(input.inviteeIds ?? [])).filter((id) => id && id !== ctx.userId).slice(0, 50);

  const { data, error } = await ctx.supabase
    .from("scheduled_watches")
    .insert({
      host_id: ctx.userId,
      tmdb_id: input.tmdbId,
      media_type: mediaType,
      title: input.title.trim().slice(0, 200),
      poster_url: input.posterUrl,
      season_number: input.seasonNumber,
      episode_number: input.episodeNumber,
      scheduled_at: when.toISOString(),
      note: input.note ? input.note.trim().slice(0, 500) : null,
      is_party: invitees.length > 0,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't schedule that." };
  const id = (data as { id: string }).id;

  if (invitees.length) {
    const rows = invitees.map((uid) => ({ schedule_id: id, user_id: uid, status: "invited" }));
    await ctx.supabase.from("scheduled_watch_invites").insert(rows);

    // Notify each invitee (fan-out → in-app + push).
    const { data: me } = await ctx.supabase.from("profiles").select("display_name").eq("id", ctx.userId).maybeSingle();
    const host = (me as { display_name?: string } | null)?.display_name ?? "A friend";
    const ep = input.seasonNumber != null && input.episodeNumber != null ? ` S${input.seasonNumber} E${input.episodeNumber}` : "";
    await Promise.all(
      invitees.map((uid) =>
        notify(uid, { type: "invite", message: `${host} invited you to watch ${input.title}${ep}`, link: "/schedule" }),
      ),
    );
  }

  return { ok: true, id };
}

/** Invitee sets their RSVP (going | maybe | declined). */
export async function rsvpWatch(scheduleId: string, status: string): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const s = ["going", "maybe", "declined", "invited"].includes(status) ? status : "going";
  const { error } = await ctx.supabase
    .from("scheduled_watch_invites")
    .update({ status: s })
    .eq("schedule_id", scheduleId)
    .eq("user_id", ctx.userId);
  return { ok: !error, error: error?.message };
}

/**
 * Toggle whether the caller gets a "starting soon" reminder for one watch.
 * on=true clears any mute; on=false records a mute. Works for the host and
 * for "going" invitees (each mutes only their own reminder).
 */
export async function setWatchNotify(scheduleId: string, on: boolean): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  if (on) {
    const { error } = await ctx.supabase
      .from("scheduled_watch_mutes")
      .delete()
      .eq("user_id", ctx.userId)
      .eq("schedule_id", scheduleId);
    return { ok: !error, error: error?.message };
  }
  const { error } = await ctx.supabase
    .from("scheduled_watch_mutes")
    .upsert({ user_id: ctx.userId, schedule_id: scheduleId }, { onConflict: "user_id,schedule_id" });
  return { ok: !error, error: error?.message };
}

/** Host cancels (deletes) a scheduled watch. RLS enforces host-only. */
export async function cancelScheduledWatch(scheduleId: string): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  const { error } = await ctx.supabase.from("scheduled_watches").delete().eq("id", scheduleId);
  return { ok: !error, error: error?.message };
}

/** Friends the viewer can invite to a watch party (people they follow). */
export async function getInviteableFriends(): Promise<
  { id: string; username: string; display_name: string; avatar_url: string | null }[]
> {
  const ctx = await authed();
  if (!ctx) return [];
  const { data: fRows } = await ctx.supabase.from("follows").select("following_id").eq("follower_id", ctx.userId);
  const ids = ((fRows as { following_id: string }[] | null) ?? []).map((r) => r.following_id);
  if (!ids.length) return [];
  const { data } = await ctx.supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids)
    .limit(200);
  return (data as { id: string; username: string; display_name: string; avatar_url: string | null }[] | null) ?? [];
}

/** Store a Web Push device subscription (dormant until VAPID keys exist). */
export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<Result> {
  const ctx = await authed();
  if (!ctx) return { ok: true, demo: true };
  if (!sub?.endpoint || !sub.p256dh || !sub.auth) return { ok: false, error: "Invalid subscription." };
  const { error } = await ctx.supabase
    .from("push_subscriptions")
    .upsert({ user_id: ctx.userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { onConflict: "endpoint" });
  return { ok: !error, error: error?.message };
}
