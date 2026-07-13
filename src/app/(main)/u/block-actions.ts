"use server";

import { createClient } from "@/lib/supabase/server";

/** Block another member — hides you from each other's DMs (DB-enforced). */
export async function blockUser(targetId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Not available." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!targetId || targetId === user.id) return { ok: false, error: "Invalid user." };

  const { error } = await supabase
    .from("blocks")
    .upsert({ blocker_id: user.id, blocked_id: targetId }, { onConflict: "blocker_id,blocked_id" });
  return { ok: !error, error: error?.message };
}

/** Unblock a member you'd previously blocked. */
export async function unblockUser(targetId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Not available." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", targetId);
  return { ok: !error, error: error?.message };
}
