"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Resolve the caller and confirm they're an admin. */
async function adminCtx() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) return null;
  return { supabase, userId: user.id };
}

/**
 * Flip the global "Live Mode" switch. Admin-only.
 * `on = true`  → real, 0-based counts everywhere.
 * `on = false` → seeded demo numbers.
 * Revalidates the whole tree so every cached count refreshes immediately.
 */
export async function setLiveMode(
  on: boolean,
): Promise<{ ok: boolean; live?: boolean; error?: string }> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "Not authorized." };

  const { error } = await ctx.supabase.from("app_settings").upsert({
    id: 1,
    live_mode: on,
    updated_at: new Date().toISOString(),
    updated_by: ctx.userId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, live: on };
}
