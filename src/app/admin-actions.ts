"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

export type AccountStatus = "active" | "muted" | "limited" | "suspended" | "banned";

async function adminContext() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return null;
  return { supabase, userId: user.id };
}

function revalidateUser(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

/** Resolve / dismiss / reopen a report. */
export async function setReportStatus(
  reportId: string,
  status: "open" | "reviewing" | "resolved" | "dismissed",
): Promise<Result> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, error: "Not authorized" };
  const { error } = await ctx.supabase.from("reports").update({ status }).eq("id", reportId);
  revalidatePath("/admin/reports");
  return { ok: !error, error: error?.message };
}

/** Remove the reported comment/review, then mark its report resolved. */
export async function removeReportedContent(
  reportId: string,
  targetType: "comment" | "review",
  targetId: string,
): Promise<Result> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, error: "Not authorized" };

  const table = targetType === "comment" ? "comments" : "reviews";
  const { error: delErr } = await ctx.supabase.from(table).delete().eq("id", targetId);
  if (delErr) return { ok: false, error: delErr.message };

  await ctx.supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
  revalidatePath("/admin/reports");
  return { ok: true };
}

/* ---------------- User moderation ---------------- */

/** Promote to admin / demote to member. */
export async function changeRole(userId: string, makeAdmin: boolean): Promise<Result> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, error: "Not authorized" };
  const { error } = await ctx.supabase.from("profiles").update({ is_admin: makeAdmin }).eq("id", userId);
  revalidateUser(userId);
  return { ok: !error, error: error?.message };
}

/** Set an account's moderation status (active/muted/limited/suspended/banned). */
export async function setUserStatus(
  userId: string,
  status: AccountStatus,
  reason?: string,
): Promise<Result> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, error: "Not authorized" };
  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      status,
      status_reason: reason?.trim() || null,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  revalidateUser(userId);
  return { ok: !error, error: error?.message };
}

/** Attach a private admin note to a user. */
export async function addAdminNote(userId: string, body: string): Promise<Result> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, error: "Not authorized" };
  const text = body.trim();
  if (!text) return { ok: false, error: "Note is empty" };
  const { error } = await ctx.supabase
    .from("admin_notes")
    .insert({ user_id: userId, author_id: ctx.userId, body: text });
  revalidateUser(userId);
  return { ok: !error, error: error?.message };
}

/** Issue a warning to a user. */
export async function warnUser(userId: string, reason: string): Promise<Result> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, error: "Not authorized" };
  const text = reason.trim();
  if (!text) return { ok: false, error: "Reason is required" };
  const { error } = await ctx.supabase
    .from("user_warnings")
    .insert({ user_id: userId, issued_by: ctx.userId, reason: text });
  revalidateUser(userId);
  return { ok: !error, error: error?.message };
}
