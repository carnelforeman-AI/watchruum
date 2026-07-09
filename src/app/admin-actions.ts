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

/**
 * Flag the reported content as containing a spoiler by escalating its
 * spoiler_scope, then mark the report resolved. Users then see the content
 * blurred behind a "This contains a spoiler" overlay until they unlock it.
 */
export async function markContentSpoiler(
  reportId: string,
  targetType: "comment" | "review",
  targetId: string,
  scope: "episode" | "season" | "series" = "series",
): Promise<Result> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, error: "Not authorized" };

  const table = targetType === "comment" ? "comments" : "reviews";
  const { error } = await ctx.supabase.from(table).update({ spoiler_scope: scope }).eq("id", targetId);
  if (error) return { ok: false, error: error.message };

  await ctx.supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  return { ok: true };
}

/** Set a piece of content's spoiler scope directly (used to undo a spoiler flag). */
export async function setContentSpoilerScope(
  targetType: "comment" | "review",
  targetId: string,
  scope: "none" | "episode" | "season" | "series",
): Promise<Result> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, error: "Not authorized" };
  const table = targetType === "comment" ? "comments" : "reviews";
  const { error } = await ctx.supabase.from(table).update({ spoiler_scope: scope }).eq("id", targetId);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  return { ok: !error, error: error?.message };
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

/* ---------------- Watch room moderation ---------------- */

export type RoomFlag = "featured" | "pinned" | "locked" | "archived" | "hidden";
export type RoomFlags = Partial<Record<RoomFlag, boolean>>;

/**
 * Persist admin overrides for a derived room (keyed by its stable room id).
 * Upserts so a room row is created lazily the first time it's touched.
 */
export async function setRoomFlags(roomKey: string, patch: RoomFlags): Promise<Result> {
  const ctx = await adminContext();
  if (!ctx) return { ok: false, error: "Not authorized" };
  if (!roomKey) return { ok: false, error: "Missing room" };

  const allowed: RoomFlag[] = ["featured", "pinned", "locked", "archived", "hidden"];
  const clean: RoomFlags = {};
  for (const k of allowed) if (typeof patch[k] === "boolean") clean[k] = patch[k];
  if (Object.keys(clean).length === 0) return { ok: false, error: "Nothing to update" };

  const { error } = await ctx.supabase.from("room_states").upsert(
    {
      room_key: roomKey,
      ...clean,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_key" },
  );

  revalidatePath("/admin/rooms");
  return { ok: !error, error: error?.message };
}
