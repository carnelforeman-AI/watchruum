import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { routeId } from "@/lib/utils";
import { sendPush, pushConfigured } from "./providers";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface WatchReminderResult {
  ok: boolean;
  configured: boolean; // service role available
  due: number; // scheduled watches starting soon
  inApp: number; // in-app notifications created
  push: { attempted: number; sent: number; skipped: boolean };
  error?: string;
}

/**
 * Fires "starting soon" reminders for scheduled watches whose start time is
 * within the look-ahead window and haven't been reminded yet. Creates a REAL
 * in-app notification for the host and every "going" invitee, and (when VAPID
 * keys are set) a Web Push to each of their devices. Needs the service-role key
 * to write notifications across users; dormant otherwise — the calendar export
 * (.ics / Google Calendar) covers reminders in the meantime.
 *
 * Run frequently (e.g. every 15 min) via Vercel Cron. Window default 20 min so
 * a 15-min cron never misses one.
 */
export async function dispatchWatchReminders(windowMinutes = 20): Promise<WatchReminderResult> {
  const base: WatchReminderResult = {
    ok: false,
    configured: false,
    due: 0,
    inApp: 0,
    push: { attempted: 0, sent: 0, skipped: !pushConfigured() },
  };

  const sb = createServiceClient();
  if (!sb) return { ...base, ok: true, error: "SUPABASE_SERVICE_ROLE_KEY not set — reminder engine dormant." };
  base.configured = true;

  const now = Date.now();
  const until = new Date(now + windowMinutes * 60_000).toISOString();
  const nowIso = new Date(now).toISOString();

  // Scheduled watches starting within the window, not yet reminded.
  const { data: dueRows, error } = await sb
    .from("scheduled_watches")
    .select("id, host_id, tmdb_id, media_type, title, season_number, episode_number, scheduled_at")
    .gte("scheduled_at", nowIso)
    .lte("scheduled_at", until)
    .is("reminded_at", null)
    .limit(500);

  if (error) return { ...base, error: error.message };
  const due = (dueRows as any[]) ?? [];
  base.due = due.length;
  if (!due.length) return { ...base, ok: true };

  const ids = due.map((r) => r.id);

  // "going" invitees per schedule.
  const { data: inviteRows } = await sb
    .from("scheduled_watch_invites")
    .select("schedule_id, user_id, status")
    .in("schedule_id", ids)
    .eq("status", "going");
  const goingBySchedule = new Map<string, string[]>();
  for (const i of (inviteRows as any[]) ?? []) {
    const arr = goingBySchedule.get(i.schedule_id) ?? [];
    arr.push(i.user_id);
    goingBySchedule.set(i.schedule_id, arr);
  }

  // Per-item mutes — a user who toggled "Notify me" off for a watch is skipped.
  const { data: muteRows } = await sb
    .from("scheduled_watch_mutes")
    .select("schedule_id, user_id")
    .in("schedule_id", ids);
  const muted = new Set<string>();
  for (const m of (muteRows as any[]) ?? []) muted.add(`${m.schedule_id}:${m.user_id}`);

  const link = (r: any) => `/title/${routeId(r.media_type, r.tmdb_id, r.title)}`;
  const label = (r: any) =>
    r.season_number != null && r.episode_number != null
      ? `${r.title} S${r.season_number} E${r.episode_number}`
      : r.title;

  // 1) In-app notifications for host + going invitees.
  const notifRows: any[] = [];
  const recipientsBySchedule = new Map<string, string[]>();
  for (const r of due) {
    const recips = Array.from(new Set([r.host_id, ...(goingBySchedule.get(r.id) ?? [])])).filter(
      (uid) => !muted.has(`${r.id}:${uid}`),
    );
    recipientsBySchedule.set(r.id, recips);
    for (const uid of recips) {
      notifRows.push({
        user_id: uid,
        type: "reminder",
        message: `Starting soon: ${label(r)} — your watch begins shortly.`,
        link: link(r),
      });
    }
  }
  if (notifRows.length) {
    const { error: insErr } = await sb.from("notifications").insert(notifRows);
    if (!insErr) base.inApp = notifRows.length;
  }

  // 2) Web Push (only when configured). Look up each recipient's devices.
  if (pushConfigured()) {
    const allRecipients = Array.from(new Set([...recipientsBySchedule.values()].flat()));
    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", allRecipients);
    const subsByUser = new Map<string, any[]>();
    for (const s of (subs as any[]) ?? []) {
      const arr = subsByUser.get(s.user_id) ?? [];
      arr.push(s);
      subsByUser.set(s.user_id, arr);
    }
    for (const r of due) {
      for (const uid of recipientsBySchedule.get(r.id) ?? []) {
        for (const s of subsByUser.get(uid) ?? []) {
          base.push.attempted++;
          const res = await sendPush(s, { title: "Watchruum", body: `Starting soon: ${label(r)}`, url: link(r) });
          if (res.sent) base.push.sent++;
          else if (res.gone) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }
  }

  // 3) Mark reminded so nobody gets a duplicate.
  await sb.from("scheduled_watches").update({ reminded_at: new Date().toISOString() }).in("id", ids);

  return { ...base, ok: true };
}
