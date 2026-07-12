import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPush, pushConfigured } from "./providers";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type NotifyType =
  | "message"
  | "reply"
  | "like"
  | "reaction"
  | "follow"
  | "invite"
  | "unlock"
  | "trending"
  | "release"
  | "reminder";

/** Which per-user preference column gates *push* for each type (undefined = always). */
const PREF_COL: Partial<Record<NotifyType, string>> = {
  message: "notify_messages",
  reply: "notify_replies",
  like: "notify_likes",
  reaction: "notify_likes",
  unlock: "notify_unlocks",
  trending: "notify_trending",
  release: "notify_releases",
  reminder: "notify_reminders",
  // follow, invite: always allowed (low-frequency, high-value)
};

export interface NotifyInput {
  type: NotifyType;
  message: string; // shown in-app and as the push body
  link?: string; // where tapping goes (default /notifications)
  pushTitle?: string; // push notification title (default "Watchruum")
}

/**
 * THE notification choke point. Creates a real in-app notification for
 * `recipientId` and — when Web Push is configured and the recipient hasn't
 * muted that type — fans it out to all of their registered devices.
 *
 * - In-app row is written via the `create_notification` SECURITY DEFINER RPC,
 *   so it works cross-user with just the caller's (authed) session — no service
 *   role required.
 * - Push needs the service-role key (to read another user's subscriptions) and
 *   VAPID keys; it stays dormant until both exist.
 *
 * Best-effort: never throws, so a notification failure can't break the action
 * that triggered it (a DM still sends even if the push errors).
 */
export async function notify(recipientId: string | null | undefined, input: NotifyInput): Promise<void> {
  if (!recipientId) return;
  const link = input.link ?? "/notifications";
  try {
    const supabase = await createClient();
    if (!supabase) return;

    // 1) In-app notification (works now, no service role).
    await supabase.rpc("create_notification", {
      p_recipient: recipientId,
      p_type: input.type,
      p_message: input.message,
      p_link: link,
    });

    // 2) Web Push fan-out (dormant until VAPID + service role).
    if (!pushConfigured()) return;
    const sb = createServiceClient();
    if (!sb) return;

    const prefCol = PREF_COL[input.type];
    if (prefCol) {
      const { data: prof } = await sb.from("profiles").select(prefCol).eq("id", recipientId).maybeSingle();
      if (prof && (prof as any)[prefCol] === false) return; // muted this type
    }

    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", recipientId);

    for (const s of (subs as any[]) ?? []) {
      const res = await sendPush(s, { title: input.pushTitle ?? "Watchruum", body: input.message, url: link });
      if (res.gone) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  } catch {
    /* notifications are best-effort — never break the triggering action */
  }
}
