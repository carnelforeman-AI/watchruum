import "server-only";
import { createClient } from "./supabase/server";

/**
 * Real Quality Leadership Board, used when Live Mode is ON.
 *
 * Ranks actual signed-up members by real activity — no fabricated people.
 * Every metric is a true row count, so the board starts nearly empty and
 * fills in as members review, discuss, tag spoilers and get liked.
 *
 * Quality Score = a weighted blend that rewards being helpful (likes
 * received), contributing (reviews + discussion) and keeping rooms
 * spoiler-safe (correctly tagging spoilers).
 */

export interface LeaderMember {
  id: number;
  name: string; // username, so "View Profile" → /u/<name> resolves
  quality: number;
  helpful: number; // likes received on their reviews + comments
  spoiler: number; // pieces of content they correctly tagged as spoilers
  reports: number; // reserved (member-facing = 0)
  badges: number[]; // earned badge indices (thresholds below)
  extra: number; // additional earned badges beyond the shown ones
  role: "Mod" | "Leader" | null;
}

export interface LeaderStats {
  quality: number; // members with any recognized activity
  interactions: number; // total positive interactions (likes) given
  spoilers: number; // total spoilers correctly flagged
  reports: number; // reports resolved
}

interface Agg {
  reviews: number;
  comments: number;
  spoiler: number;
  helpful: number;
}

/** Threshold-based, genuinely-earned badges (indices map to BADGES in the view). */
function earnedBadges(a: Agg): number[] {
  const b: number[] = [];
  if (a.reviews >= 1) b.push(0); // Star — wrote a review
  if (a.spoiler >= 1) b.push(1); // Shield — tagged a spoiler
  if (a.helpful >= 5) b.push(2); // Heart — liked by others
  if (a.reviews + a.comments >= 10) b.push(3); // Flame — active
  if (a.comments >= 1) b.push(4); // Check — joined a discussion
  if (a.helpful >= 25) b.push(5); // Award — well-liked
  return b;
}

export async function getLeaderboard(): Promise<{
  members: LeaderMember[];
  stats: LeaderStats;
}> {
  const empty = { members: [], stats: { quality: 0, interactions: 0, spoilers: 0, reports: 0 } };
  const supabase = await createClient();
  if (!supabase) return empty;

  try {
    const [profilesRes, reviewsRes, commentsRes, reactionsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, is_admin").limit(2000),
      supabase.from("reviews").select("id, user_id, spoiler_scope").limit(20000),
      supabase.from("comments").select("id, user_id, spoiler_scope").limit(20000),
      supabase.from("reactions").select("target_id").limit(50000),
    ]);

    const profiles =
      (profilesRes.data as
        | { id: string; username: string; display_name: string; is_admin: boolean }[]
        | null) ?? [];
    const reviews =
      (reviewsRes.data as { id: string; user_id: string; spoiler_scope: string }[] | null) ?? [];
    const comments =
      (commentsRes.data as { id: string; user_id: string; spoiler_scope: string }[] | null) ?? [];
    const reactions = (reactionsRes.data as { target_id: string }[] | null) ?? [];

    const agg = new Map<string, Agg>();
    const ensure = (uid: string): Agg => {
      let a = agg.get(uid);
      if (!a) {
        a = { reviews: 0, comments: 0, spoiler: 0, helpful: 0 };
        agg.set(uid, a);
      }
      return a;
    };

    // target_id (review or comment) -> author, so we can credit likes received.
    const authorByTarget = new Map<string, string>();

    for (const r of reviews) {
      const a = ensure(r.user_id);
      a.reviews += 1;
      if (r.spoiler_scope && r.spoiler_scope !== "none") a.spoiler += 1;
      authorByTarget.set(r.id, r.user_id);
    }
    for (const c of comments) {
      const a = ensure(c.user_id);
      a.comments += 1;
      if (c.spoiler_scope && c.spoiler_scope !== "none") a.spoiler += 1;
      authorByTarget.set(c.id, c.user_id);
    }
    for (const rx of reactions) {
      const author = authorByTarget.get(rx.target_id);
      if (author) ensure(author).helpful += 1;
    }

    const members: LeaderMember[] = profiles.map((p, i) => {
      const a = agg.get(p.id) ?? { reviews: 0, comments: 0, spoiler: 0, helpful: 0 };
      const quality = a.helpful * 15 + a.reviews * 25 + a.comments * 6 + a.spoiler * 10;
      const badges = earnedBadges(a);
      return {
        id: i,
        name: p.username || p.display_name || "member",
        quality,
        helpful: a.helpful,
        spoiler: a.spoiler,
        reports: 0,
        badges: badges.slice(0, 3),
        extra: Math.max(0, badges.length - 3),
        role: p.is_admin ? "Mod" : null,
      };
    });

    members.sort((a, b) => b.quality - a.quality || b.helpful - a.helpful);
    members.forEach((m, i) => (m.id = i));

    let reportsResolved = 0;
    try {
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "resolved");
      reportsResolved = count ?? 0;
    } catch {
      reportsResolved = 0;
    }

    const stats: LeaderStats = {
      quality: members.filter((m) => m.quality > 0).length,
      interactions: reactions.length,
      spoilers: [...agg.values()].reduce((s, a) => s + a.spoiler, 0),
      reports: reportsResolved,
    };

    return { members, stats };
  } catch {
    return empty;
  }
}
