"use server";

import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify/fanout";

/**
 * Fan a new direct message out to the recipient (in-app notification + Web Push).
 * Called by the sender's client after the message is inserted — DMs are written
 * client-side for Realtime immediacy, so this is the server hop that can push.
 */
export async function notifyDirectMessage(recipientId: string, preview: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !recipientId || recipientId === user.id) return { ok: false };

  const { data: me } = await supabase.from("profiles").select("username, display_name").eq("id", user.id).maybeSingle();
  const p = me as { username?: string; display_name?: string } | null;
  const name = p?.display_name ?? "New message";
  const link = p?.username ? `/u/${p.username}` : "/friends";

  await notify(recipientId, {
    type: "message",
    message: `${name}: ${preview}`.slice(0, 160),
    pushTitle: name,
    link,
  });
  return { ok: true };
}
