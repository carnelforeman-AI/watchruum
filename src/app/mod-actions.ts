"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

/** Caller must be a moderator or an admin. */
async function modCtx() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin, is_moderator")
    .eq("id", user.id)
    .maybeSingle();
  const p = me as { is_admin?: boolean; is_moderator?: boolean } | null;
  if (!p?.is_admin && !p?.is_moderator) return null;
  return { supabase };
}

/**
 * Update a report's status from the Moderator Dashboard (review / dismiss /
 * resolve). Uses the SECURITY DEFINER `mod_set_report_status` so it works for
 * moderators and admins alike.
 */
export async function modSetReportStatus(
  reportId: string,
  status: "open" | "reviewing" | "resolved" | "dismissed",
): Promise<Result> {
  const ctx = await modCtx();
  if (!ctx) return { ok: false, error: "Not authorized." };
  const { error } = await ctx.supabase.rpc("mod_set_report_status", {
    report_id: reportId,
    new_status: status,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/mod");
  return { ok: true };
}
