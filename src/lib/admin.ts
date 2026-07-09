import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { trending } from "./tmdb";
import { getTrendingRooms } from "./queries";
import type { MediaItem, Room } from "./types";

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

/* ------------------------------------------------------------------ */
/* Overview dashboard                                                  */
/* ------------------------------------------------------------------ */

export interface AdminStat {
  key: string;
  label: string;
  value: number;
  delta: number | null; // new items in the last 7 days (real), null when N/A
}

export interface BreakdownSlice {
  label: string;
  value: number;
  color: string;
}

export interface ActivityEvent {
  id: string;
  kind: "user" | "review" | "report" | "comment";
  title: string;
  subtitle: string;
  created_at: string;
}

export interface RecentReportRow {
  id: string;
  type: "comment" | "review";
  content: string;
  reporter: string;
  reason: string;
  created_at: string;
  status: string;
}

export interface AdminOverview {
  isAdmin: boolean;
  stats: AdminStat[];
  breakdown: BreakdownSlice[];
  totalUsers: number;
  activitySeries: { label: string; value: number }[];
  recentReports: RecentReportRow[];
  recentActivity: ActivityEvent[];
  trendingShows: MediaItem[];
  trendingMovies: MediaItem[];
  activeRooms: Room[];
}

async function isCurrentUserAdmin() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, admin: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, admin: false };
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return { supabase, admin: !!me?.is_admin };
}

/** Real counts + illustrative extras for the admin Overview page. */
export const getAdminOverview = cache(async (): Promise<AdminOverview> => {
  const empty: AdminOverview = {
    isAdmin: false,
    stats: [],
    breakdown: [],
    totalUsers: 0,
    activitySeries: [],
    recentReports: [],
    recentActivity: [],
    trendingShows: [],
    trendingMovies: [],
    activeRooms: [],
  };

  const { supabase, admin } = await isCurrentUserAdmin();
  if (!supabase || !admin) return empty;

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const countOf = async (table: string, sinceCol?: string) => {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (sinceCol) q = q.gte(sinceCol, weekAgo);
    const { count } = await q;
    return count ?? 0;
  };

  // Real counts (parallel). head:true so no rows are transferred.
  const [
    users,
    usersNew,
    titles,
    reviews,
    reviewsNew,
    comments,
    commentsNew,
    reports,
    reportsNew,
    admins,
  ] = await Promise.all([
    countOf("profiles"),
    countOf("profiles", "created_at"),
    countOf("media_items"),
    countOf("reviews"),
    countOf("reviews", "created_at"),
    countOf("comments"),
    countOf("comments", "created_at"),
    countOf("reports"),
    countOf("reports", "created_at"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_admin", true).then((r) => r.count ?? 0),
  ]);

  const stats: AdminStat[] = [
    { key: "users", label: "Total Users", value: users, delta: usersNew },
    { key: "reviews", label: "Reviews", value: reviews, delta: reviewsNew },
    { key: "comments", label: "Posts", value: comments, delta: commentsNew },
    { key: "titles", label: "Titles Tracked", value: titles, delta: null },
    { key: "reports", label: "Reports", value: reports, delta: reportsNew },
  ];

  const established = Math.max(0, users - usersNew - admins);
  const breakdown: BreakdownSlice[] = [
    { label: "New this week", value: usersNew, color: "var(--color-primary)" },
    { label: "Established", value: established, color: "var(--color-accent)" },
    { label: "Admins", value: admins, color: "var(--color-accent-2)" },
  ];

  // Recent reports (real).
  const { data: rr } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(display_name)")
    .order("created_at", { ascending: false })
    .limit(6);
  const rrRows = (rr ?? []) as any[];

  // Pull a short body for each reported item to show in the table.
  const cIds = rrRows.filter((r) => r.target_type === "comment").map((r) => r.target_id);
  const vIds = rrRows.filter((r) => r.target_type === "review").map((r) => r.target_id);
  const [{ data: cRows }, { data: vRows }] = await Promise.all([
    cIds.length ? supabase.from("comments").select("id, media:media_items(title)").in("id", cIds) : Promise.resolve({ data: [] as any[] }),
    vIds.length ? supabase.from("reviews").select("id, media:media_items(title)").in("id", vIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const titleById = new Map<string, string>();
  for (const c of (cRows ?? []) as any[]) titleById.set(c.id, c.media?.title ?? "");
  for (const v of (vRows ?? []) as any[]) titleById.set(v.id, v.media?.title ?? "");

  const recentReports: RecentReportRow[] = rrRows.map((r) => ({
    id: r.id,
    type: r.target_type,
    content: titleById.get(r.target_id) || (r.target_type === "review" ? "Review" : "Post"),
    reporter: r.reporter?.display_name ?? "Someone",
    reason: r.reason,
    created_at: r.created_at,
    status: r.status,
  }));

  // Recent activity: merge new users + reviews + reports (all real).
  const [{ data: newUsers }, { data: newReviews }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, created_at").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("reviews")
      .select("id, score, created_at, author:profiles(display_name), media:media_items(title)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const events: ActivityEvent[] = [];
  for (const u of (newUsers ?? []) as any[]) {
    events.push({ id: `u_${u.id}`, kind: "user", title: "New member joined", subtitle: u.display_name ?? "Someone", created_at: u.created_at });
  }
  for (const v of (newReviews ?? []) as any[]) {
    events.push({
      id: `v_${v.id}`,
      kind: "review",
      title: `Review submitted${v.score ? ` · ${v.score}/10` : ""}`,
      subtitle: v.media?.title ?? "a title",
      created_at: v.created_at,
    });
  }
  for (const r of rrRows.slice(0, 3)) {
    events.push({ id: `r_${r.id}`, kind: "report", title: "Content reported", subtitle: r.reason, created_at: r.created_at });
  }
  events.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const recentActivity = events.slice(0, 6);

  // Illustrative 7-day activity series (no historical table yet).
  const activityLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const base = Math.max(4, Math.round((users + reviews + comments) / 7) || 6);
  const shape = [0.6, 0.75, 0.7, 0.9, 1.0, 0.85, 0.8];
  const activitySeries = activityLabels.map((label, i) => ({ label, value: Math.round(base * shape[i]) + (i % 2) }));

  // Content overview (real TMDb).
  let items: MediaItem[] = [];
  try {
    items = await trending();
  } catch {
    items = [];
  }
  const trendingShows = items.filter((m) => m.media_type === "tv").slice(0, 5);
  const trendingMovies = items.filter((m) => m.media_type === "movie").slice(0, 5);
  let activeRooms: Room[] = [];
  try {
    activeRooms = await getTrendingRooms(5);
  } catch {
    activeRooms = [];
  }

  return {
    isAdmin: true,
    stats,
    breakdown,
    totalUsers: users,
    activitySeries,
    recentReports,
    recentActivity,
    trendingShows,
    trendingMovies,
    activeRooms,
  };
});

/* ------------------------------------------------------------------ */
/* Users management                                                    */
/* ------------------------------------------------------------------ */

export interface AdminUserRow {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
  status: string;
  rooms: number;
  reports: number;
  last_active: string | null;
}

export interface AdminUsersResult {
  isAdmin: boolean;
  rows: AdminUserRow[];
  total: number; // matches current filter
  page: number;
  perPage: number;
  stats: { total: number; active: number; newUsers: number; suspended: number; banned: number; admins: number };
  breakdown: BreakdownSlice[];
  growth: { label: string; value: number }[];
}

export interface AdminUsersParams {
  q?: string;
  tab?: string; // all | active | new | suspended | banned
  role?: string; // all | admin | user
  page?: number;
  perPage?: number;
}

export const getAdminUsers = cache(async (params: AdminUsersParams = {}): Promise<AdminUsersResult> => {
  const perPage = params.perPage ?? 10;
  const page = Math.max(1, params.page ?? 1);
  const empty: AdminUsersResult = {
    isAdmin: false,
    rows: [],
    total: 0,
    page,
    perPage,
    stats: { total: 0, active: 0, newUsers: 0, suspended: 0, banned: 0, admins: 0 },
    breakdown: [],
    growth: [],
  };

  const { supabase, admin } = await isCurrentUserAdmin();
  if (!supabase || !admin) return empty;

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const tab = params.tab ?? "all";
  const role = params.role ?? "all";
  const q = (params.q ?? "").trim();

  // Global stat counts. Status filters return 0 pre-migration (no crash).
  const headCount = async (build: (qb: any) => any) => {
    const { count } = await build(supabase.from("profiles").select("*", { count: "exact", head: true }));
    return count ?? 0;
  };
  const [total, newUsers, admins, suspended, banned] = await Promise.all([
    headCount((qb) => qb),
    headCount((qb) => qb.gte("created_at", weekAgo)),
    headCount((qb) => qb.eq("is_admin", true)),
    headCount((qb) => qb.eq("status", "suspended")),
    headCount((qb) => qb.eq("status", "banned")),
  ]);
  const stats = {
    total,
    active: Math.max(0, total - suspended - banned),
    newUsers,
    suspended,
    banned,
    admins,
  };

  const breakdown: BreakdownSlice[] = [
    { label: "Members", value: Math.max(0, total - admins), color: "var(--color-primary)" },
    { label: "New this week", value: newUsers, color: "var(--color-accent)" },
    { label: "Admins", value: admins, color: "var(--color-accent-2)" },
  ];

  const growthLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const gBase = Math.max(3, Math.round(total / 7) || 4);
  const gShape = [0.7, 0.78, 0.82, 0.88, 0.94, 0.97, 1.0];
  const growth = growthLabels.map((label, i) => ({ label, value: Math.round(gBase * gShape[i]) }));

  const statusValue =
    tab === "active" ? "active" : tab === "suspended" ? "suspended" : tab === "banned" ? "banned" : null;
  const from = (page - 1) * perPage;

  const buildList = (withStatus: boolean) => {
    const cols = withStatus
      ? "id, display_name, username, avatar_url, created_at, is_admin, status"
      : "id, display_name, username, avatar_url, created_at, is_admin";
    let query = supabase.from("profiles").select(cols, { count: "exact" }).order("created_at", { ascending: false });
    if (tab === "new") query = query.gte("created_at", weekAgo);
    if (withStatus && statusValue) query = query.eq("status", statusValue);
    if (role === "admin") query = query.eq("is_admin", true);
    else if (role === "user") query = query.eq("is_admin", false);
    if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
    return query.range(from, from + perPage - 1);
  };

  let { data: profiles, count, error } = await buildList(true);
  if (error) {
    // Pre-migration fallback: no `status` column yet.
    ({ data: profiles, count } = await buildList(false));
    if (statusValue === "suspended" || statusValue === "banned") {
      profiles = [];
      count = 0;
    }
  }
  const rowsRaw = (profiles ?? []) as any[];
  const ids = rowsRaw.map((r) => r.id);

  // Per-user aggregates for this page only.
  const roomsByUser = new Map<string, number>();
  const lastByUser = new Map<string, string>();
  const reportsByUser = new Map<string, number>();

  if (ids.length) {
    const [{ data: ws }, { data: cs }, { data: vs }] = await Promise.all([
      supabase.from("watch_status").select("user_id").in("user_id", ids),
      supabase.from("comments").select("id, user_id, created_at").in("user_id", ids),
      supabase.from("reviews").select("id, user_id, created_at").in("user_id", ids),
    ]);

    for (const w of (ws ?? []) as any[]) roomsByUser.set(w.user_id, (roomsByUser.get(w.user_id) ?? 0) + 1);

    const contentAuthor = new Map<string, string>();
    for (const c of (cs ?? []) as any[]) {
      contentAuthor.set(c.id, c.user_id);
      const prev = lastByUser.get(c.user_id);
      if (!prev || c.created_at > prev) lastByUser.set(c.user_id, c.created_at);
    }
    for (const v of (vs ?? []) as any[]) {
      contentAuthor.set(v.id, v.user_id);
      const prev = lastByUser.get(v.user_id);
      if (!prev || v.created_at > prev) lastByUser.set(v.user_id, v.created_at);
    }

    const contentIds = [...contentAuthor.keys()];
    if (contentIds.length) {
      const { data: reps } = await supabase.from("reports").select("target_id").in("target_id", contentIds);
      for (const r of (reps ?? []) as any[]) {
        const author = contentAuthor.get(r.target_id);
        if (author) reportsByUser.set(author, (reportsByUser.get(author) ?? 0) + 1);
      }
    }
  }

  const rows: AdminUserRow[] = rowsRaw.map((r) => ({
    id: r.id,
    display_name: r.display_name ?? "Member",
    username: r.username ?? null,
    avatar_url: r.avatar_url ?? null,
    created_at: r.created_at,
    is_admin: !!r.is_admin,
    status: r.status ?? "active",
    rooms: roomsByUser.get(r.id) ?? 0,
    reports: reportsByUser.get(r.id) ?? 0,
    last_active: lastByUser.get(r.id) ?? null,
  }));

  return { isAdmin: true, rows, total: count ?? rows.length, page, perPage, stats, breakdown, growth };
});

/* ------------------------------------------------------------------ */
/* Single user detail                                                  */
/* ------------------------------------------------------------------ */

export interface UserDetail {
  isAdmin: boolean;
  user: {
    id: string;
    display_name: string;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    favorite_genres: string[];
    created_at: string;
    is_admin: boolean;
    status: string;
    status_reason: string | null;
  } | null;
  stats: { reviews: number; comments: number; rooms: number; reports: number; warnings: number };
  activity: { id: string; kind: "review" | "comment"; label: string; body: string; created_at: string }[];
  reports: { id: string; type: string; reason: string; status: string; created_at: string; content: string }[];
  notes: { id: string; body: string; author_name: string; created_at: string }[];
  warnings: { id: string; reason: string; issued_by_name: string; created_at: string }[];
}

export const getAdminUserDetail = cache(async (userId: string): Promise<UserDetail> => {
  const empty: UserDetail = {
    isAdmin: false,
    user: null,
    stats: { reviews: 0, comments: 0, rooms: 0, reports: 0, warnings: 0 },
    activity: [],
    reports: [],
    notes: [],
    warnings: [],
  };

  const { supabase, admin } = await isCurrentUserAdmin();
  if (!supabase || !admin) return empty;

  const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!p) return { ...empty, isAdmin: true };
  const prof = p as any;

  const [{ data: reviews }, { data: comments }, ws] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, body, score, created_at, media:media_items(title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("comments")
      .select("id, body, created_at, media:media_items(title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("watch_status").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const reviewRows = (reviews ?? []) as any[];
  const commentRows = (comments ?? []) as any[];

  const activity = [
    ...reviewRows.map((r) => ({
      id: `v_${r.id}`,
      kind: "review" as const,
      label: `Reviewed ${r.media?.title ?? "a title"}${r.score ? ` · ${r.score}/10` : ""}`,
      body: r.body ?? "",
      created_at: r.created_at,
    })),
    ...commentRows.map((c) => ({
      id: `c_${c.id}`,
      kind: "comment" as const,
      label: `Posted in ${c.media?.title ?? "a room"}`,
      body: c.body ?? "",
      created_at: c.created_at,
    })),
  ]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 15);

  // Reports against this user's content.
  const contentIds = [...reviewRows.map((r) => r.id), ...commentRows.map((c) => c.id)];
  let reportsOut: UserDetail["reports"] = [];
  if (contentIds.length) {
    const { data: reps } = await supabase
      .from("reports")
      .select("id, target_type, target_id, reason, status, created_at")
      .in("target_id", contentIds)
      .order("created_at", { ascending: false })
      .limit(20);
    const titleFor = (tid: string) => {
      const rv = reviewRows.find((r) => r.id === tid);
      if (rv) return `Review of ${rv.media?.title ?? "a title"}`;
      const cm = commentRows.find((c) => c.id === tid);
      if (cm) return `Post in ${cm.media?.title ?? "a room"}`;
      return "Content";
    };
    reportsOut = ((reps ?? []) as any[]).map((r) => ({
      id: r.id,
      type: r.target_type,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      content: titleFor(r.target_id),
    }));
  }

  // Admin notes + warnings (defensive: tables may not exist pre-migration).
  let notes: UserDetail["notes"] = [];
  let warnings: UserDetail["warnings"] = [];
  const [notesRes, warnRes] = await Promise.all([
    supabase
      .from("admin_notes")
      .select("id, body, created_at, author:profiles!admin_notes_author_id_fkey(display_name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_warnings")
      .select("id, reason, created_at, issuer:profiles!user_warnings_issued_by_fkey(display_name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (!notesRes.error) {
    notes = ((notesRes.data ?? []) as any[]).map((n) => ({
      id: n.id,
      body: n.body,
      author_name: n.author?.display_name ?? "Admin",
      created_at: n.created_at,
    }));
  }
  if (!warnRes.error) {
    warnings = ((warnRes.data ?? []) as any[]).map((w) => ({
      id: w.id,
      reason: w.reason,
      issued_by_name: w.issuer?.display_name ?? "Admin",
      created_at: w.created_at,
    }));
  }

  return {
    isAdmin: true,
    user: {
      id: prof.id,
      display_name: prof.display_name ?? "Member",
      username: prof.username ?? null,
      avatar_url: prof.avatar_url ?? null,
      bio: prof.bio ?? null,
      favorite_genres: prof.favorite_genres ?? [],
      created_at: prof.created_at,
      is_admin: !!prof.is_admin,
      status: prof.status ?? "active",
      status_reason: prof.status_reason ?? null,
    },
    stats: {
      reviews: reviewRows.length,
      comments: commentRows.length,
      rooms: ws.count ?? 0,
      reports: reportsOut.length,
      warnings: warnings.length,
    },
    activity,
    reports: reportsOut,
    notes,
    warnings,
  };
});
