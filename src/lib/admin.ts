import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ModReport {
  id: string;
  target_type: "comment" | "review";
  target_id: string;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  reporter_name: string;
  content: {
    body: string;
    spoiler_scope: string;
    season_number: number | null;
    episode_number: number | null;
    author_name: string;
    media_title: string | null;
  } | null; // null when the content was already removed
}

export interface AdminSnapshot {
  isAdmin: boolean;
  reports: ModReport[];
  counts: { open: number; resolved: number; dismissed: number };
}

/** Load the moderation queue. Returns isAdmin:false for non-admins. */
export const getAdminSnapshot = cache(async (): Promise<AdminSnapshot> => {
  const empty = { isAdmin: false, reports: [], counts: { open: 0, resolved: 0, dismissed: 0 } };
  const supabase = await createClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return empty;

  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (reports ?? []) as any[];

  // Fetch referenced content in two batched queries.
  const commentIds = rows.filter((r) => r.target_type === "comment").map((r) => r.target_id);
  const reviewIds = rows.filter((r) => r.target_type === "review").map((r) => r.target_id);

  const [{ data: comments }, { data: reviews }] = await Promise.all([
    commentIds.length
      ? supabase
          .from("comments")
          .select("id, body, spoiler_scope, season_number, episode_number, author:profiles(display_name), media:media_items(title)")
          .in("id", commentIds)
      : Promise.resolve({ data: [] as any[] }),
    reviewIds.length
      ? supabase
          .from("reviews")
          .select("id, body, spoiler_scope, season_number, episode_number, author:profiles(display_name), media:media_items(title)")
          .in("id", reviewIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const byId = new Map<string, any>();
  for (const c of (comments ?? []) as any[]) byId.set(c.id, c);
  for (const r of (reviews ?? []) as any[]) byId.set(r.id, r);

  const counts = { open: 0, resolved: 0, dismissed: 0 };
  const mapped: ModReport[] = rows.map((r) => {
    if (r.status === "resolved") counts.resolved++;
    else if (r.status === "dismissed") counts.dismissed++;
    else counts.open++;

    const c = byId.get(r.target_id);
    return {
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      reporter_name: r.reporter?.display_name ?? "Someone",
      content: c
        ? {
            body: c.body,
            spoiler_scope: c.spoiler_scope,
            season_number: c.season_number,
            episode_number: c.episode_number,
            author_name: c.author?.display_name ?? "Unknown",
            media_title: c.media?.title ?? null,
          }
        : null,
    };
  });

  return { isAdmin: true, reports: mapped, counts };
});
