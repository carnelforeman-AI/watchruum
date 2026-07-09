import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { trending } from "./tmdb";
import { getTrendingRooms } from "./queries";
import type { MediaItem, MediaType, Room } from "./types";

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

/* ------------------------------------------------------------------ */
/* Watch Rooms management                                              */
/*                                                                     */
/* Rooms are not a stored entity yet — they are derived from real TMDb */
/* titles, matching how the rest of the app models rooms. Room model:  */
/*   • a movie  → one movie room                                       */
/*   • a TV show → one main "show" room + one room per episode         */
/* Report counts are REAL (mapped from reported content back to the    */
/* title); members / activity / status are deterministic illustration. */
/* ------------------------------------------------------------------ */

export type RoomType = "movie_room" | "title_room" | "episode_room";
export type RoomStatus = "active" | "trending" | "new" | "reported" | "locked" | "archived" | "removed";

export interface AdminRoomRow {
  id: string;
  media_id: string; // route id (tmdb_movie_123 style) for linking
  title: string;
  poster_url: string | null;
  media_type: MediaType;
  room_type: RoomType;
  category: string; // "Movie Discussion" | "Show Discussion" | "Episode Discussion"
  scope_label: string; // "Movie" | "Show" | "S1 · E4"
  creator: string; // @handle (illustrative)
  members: number;
  activity: number[]; // 7-pt sparkline
  last_active: string; // iso
  created_at: string; // iso
  status: RoomStatus;
  reports: number;
  is_hot: boolean;
  // Persisted admin overrides (from room_states).
  featured: boolean;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  hidden: boolean;
}

export interface AdminRoomsResult {
  isAdmin: boolean;
  rows: AdminRoomRow[];
  total: number;
  page: number;
  perPage: number;
  stats: {
    total: number;
    active: number;
    trending: number;
    reported: number;
    locked: number;
    archived: number;
  };
  breakdown: BreakdownSlice[]; // by room type
  topShows: { title: string; rooms: number }[];
  recentActivity: RoomActivity[];
}

export interface RoomActivity {
  id: string;
  actor: string; // @handle
  verb: string;
  target: string;
  created_at: string;
}

export interface AdminRoomsParams {
  q?: string;
  tab?: string; // all | active | trending | new | reported | locked | archived
  type?: string; // all | movie | show | episode
  page?: number;
  perPage?: number;
}

/** Deterministic 0..1 generator seeded by an integer (stable across renders). */
function seeded(seed: number) {
  let x = ((seed % 2147483647) + 2147483647) % 2147483647 || 1;
  return () => {
    x = (x * 48271) % 2147483647;
    return (x - 1) / 2147483646;
  };
}

const ROOM_CREATORS = [
  "watchruum",
  "roomkeeper",
  "spoilerfree",
  "bingebot",
  "screenmod",
  "fanwrangler",
  "episodeone",
  "nightowl",
];

export const getAdminRooms = cache(async (params: AdminRoomsParams = {}): Promise<AdminRoomsResult> => {
  const perPage = params.perPage ?? 10;
  const page = Math.max(1, params.page ?? 1);
  const empty: AdminRoomsResult = {
    isAdmin: false,
    rows: [],
    total: 0,
    page,
    perPage,
    stats: { total: 0, active: 0, trending: 0, reported: 0, locked: 0, archived: 0 },
    breakdown: [],
    topShows: [],
    recentActivity: [],
  };

  const { supabase, admin } = await isCurrentUserAdmin();
  if (!supabase || !admin) return empty;

  // Real report counts, mapped from reported content back to its TMDb title.
  const reportsByTmdb = new Map<number, number>();
  try {
    const { data: reps } = await supabase.from("reports").select("target_id, target_type").limit(500);
    const repRows = (reps ?? []) as any[];
    const cIds = repRows.filter((r) => r.target_type === "comment").map((r) => r.target_id);
    const vIds = repRows.filter((r) => r.target_type === "review").map((r) => r.target_id);
    const [{ data: cRows }, { data: vRows }] = await Promise.all([
      cIds.length ? supabase.from("comments").select("id, media:media_items(tmdb_id)").in("id", cIds) : Promise.resolve({ data: [] as any[] }),
      vIds.length ? supabase.from("reviews").select("id, media:media_items(tmdb_id)").in("id", vIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const tmdbByContent = new Map<string, number>();
    for (const c of (cRows ?? []) as any[]) if (c.media?.tmdb_id) tmdbByContent.set(c.id, c.media.tmdb_id);
    for (const v of (vRows ?? []) as any[]) if (v.media?.tmdb_id) tmdbByContent.set(v.id, v.media.tmdb_id);
    for (const r of repRows) {
      const t = tmdbByContent.get(r.target_id);
      if (t != null) reportsByTmdb.set(t, (reportsByTmdb.get(t) ?? 0) + 1);
    }
  } catch {
    /* reports table optional */
  }

  // Derive rooms from real TMDb trending titles.
  let items: MediaItem[] = [];
  try {
    items = await trending();
  } catch {
    items = [];
  }

  const now = Date.now();
  const day = 86400000;
  const all: AdminRoomRow[] = [];
  const showRoomCounts: { title: string; rooms: number }[] = [];

  items.forEach((m, idx) => {
    const rand = seeded(m.tmdb_id + idx);
    const creator = ROOM_CREATORS[m.tmdb_id % ROOM_CREATORS.length];
    const spark = () => Array.from({ length: 7 }, () => Math.round(20 + rand() * 80));
    const titleReports = reportsByTmdb.get(m.tmdb_id) ?? 0;

    const pickStatus = (base: number, hot: boolean, forceReported: boolean): RoomStatus => {
      if (forceReported) return "reported";
      const r = rand();
      if (hot && r < 0.6) return "trending";
      if (base < 7 * day) return "new";
      if (r > 0.93) return "archived";
      if (r > 0.86) return "locked";
      return "active";
    };

    if (m.media_type === "movie") {
      const created = now - Math.round(rand() * 120) * day;
      all.push({
        id: `mov_${m.tmdb_id}`,
        media_id: m.id,
        title: m.title,
        poster_url: m.poster_url,
        media_type: "movie",
        room_type: "movie_room",
        category: "Movie Discussion",
        scope_label: "Movie",
        creator,
        members: Math.round(300 + rand() * 5200),
        activity: spark(),
        last_active: new Date(now - Math.round(rand() * 5) * day - Math.round(rand() * day)).toISOString(),
        created_at: new Date(created).toISOString(),
        status: pickStatus(now - created, idx < 3, titleReports > 0),
        reports: titleReports,
        is_hot: idx < 3,
        featured: false,
        pinned: false,
        locked: false,
        archived: false,
        hidden: false,
      });
      showRoomCounts.push({ title: m.title, rooms: 1 });
      return;
    }

    // TV show → main show room + per-episode rooms.
    const created = now - Math.round(30 + rand() * 200) * day;
    all.push({
      id: `show_${m.tmdb_id}`,
      media_id: m.id,
      title: m.title,
      poster_url: m.poster_url,
      media_type: "tv",
      room_type: "title_room",
      category: "Show Discussion",
      scope_label: "Show",
      creator,
      members: Math.round(2000 + rand() * 14000),
      activity: spark(),
      last_active: new Date(now - Math.round(rand() * 2) * day - Math.round(rand() * day)).toISOString(),
      created_at: new Date(created).toISOString(),
      status: pickStatus(now - created, idx < 3, titleReports > 0),
      reports: titleReports,
      is_hot: idx < 3,
      featured: false,
      pinned: false,
      locked: false,
      archived: false,
      hidden: false,
    });

    const epCount = 3 + Math.floor(rand() * 5); // 3–7 episode rooms
    for (let ep = 1; ep <= epCount; ep++) {
      const epRand = seeded(m.tmdb_id * 100 + ep);
      const epCreated = now - Math.round(epRand() * 90) * day;
      all.push({
        id: `ep_${m.tmdb_id}_s1e${ep}`,
        media_id: m.id,
        title: m.title,
        poster_url: m.poster_url,
        media_type: "tv",
        room_type: "episode_room",
        category: "Episode Discussion",
        scope_label: `S1 · E${ep}`,
        creator: ROOM_CREATORS[(m.tmdb_id + ep) % ROOM_CREATORS.length],
        members: Math.round(120 + epRand() * 3400),
        activity: Array.from({ length: 7 }, () => Math.round(10 + epRand() * 70)),
        last_active: new Date(now - Math.round(epRand() * 6) * day - Math.round(epRand() * day)).toISOString(),
        created_at: new Date(epCreated).toISOString(),
        status: pickStatus(now - epCreated, ep === epCount && idx < 3, false),
        reports: 0,
        is_hot: ep === epCount && idx < 3,
        featured: false,
        pinned: false,
        locked: false,
        archived: false,
        hidden: false,
      });
    }
    showRoomCounts.push({ title: m.title, rooms: 1 + epCount });
  });

  // Overlay persisted admin overrides (room_states). Table is optional
  // pre-migration; a failed read simply leaves defaults in place.
  try {
    const keys = all.map((r) => r.id);
    if (keys.length) {
      const { data: states } = await supabase
        .from("room_states")
        .select("room_key, featured, pinned, locked, archived, hidden")
        .in("room_key", keys);
      const byKey = new Map<string, any>();
      for (const s of (states ?? []) as any[]) byKey.set(s.room_key, s);
      for (const r of all) {
        const s = byKey.get(r.id);
        if (!s) continue;
        r.featured = !!s.featured;
        r.pinned = !!s.pinned;
        r.locked = !!s.locked;
        r.archived = !!s.archived;
        r.hidden = !!s.hidden;
        // Persisted moderation state wins over the derived status.
        if (r.hidden) r.status = "removed";
        else if (r.archived) r.status = "archived";
        else if (r.locked) r.status = "locked";
      }
    }
  } catch {
    /* room_states table optional pre-migration */
  }

  // Pinned rooms float to the top of the list.
  all.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));

  // Global stats over the derived set (removed rooms excluded from totals).
  const visible = all.filter((r) => !r.hidden);
  const stats = {
    total: visible.length,
    active: visible.filter((r) => r.status === "active" || r.status === "new").length,
    trending: visible.filter((r) => r.status === "trending").length,
    reported: visible.filter((r) => r.status === "reported").length,
    locked: visible.filter((r) => r.status === "locked").length,
    archived: visible.filter((r) => r.status === "archived").length,
  };

  const typeCount = (t: RoomType) => visible.filter((r) => r.room_type === t).length;
  const breakdown: BreakdownSlice[] = [
    { label: "Episode Rooms", value: typeCount("episode_room"), color: "var(--color-primary)" },
    { label: "Show Rooms", value: typeCount("title_room"), color: "var(--color-accent)" },
    { label: "Movie Rooms", value: typeCount("movie_room"), color: "var(--color-accent-2)" },
  ];

  const topShows = showRoomCounts
    .filter((s) => s.rooms > 1)
    .sort((a, b) => b.rooms - a.rooms)
    .slice(0, 5);
  if (topShows.length === 0) {
    topShows.push(...showRoomCounts.sort((a, b) => b.rooms - a.rooms).slice(0, 5));
  }

  // Recent room activity (illustrative, drawn from the derived rooms).
  const recentActivity: RoomActivity[] = [...visible]
    .sort((a, b) => (a.last_active < b.last_active ? 1 : -1))
    .slice(0, 6)
    .map((r) => ({
      id: `ra_${r.id}`,
      actor: r.creator,
      verb: r.status === "trending" ? "sparked a discussion in" : "joined",
      target: `${r.title}${r.scope_label !== "Movie" && r.scope_label !== "Show" ? ` · ${r.scope_label}` : ""}`,
      created_at: r.last_active,
    }));

  // Filter.
  const tab = params.tab ?? "all";
  const type = params.type ?? "all";
  const q = (params.q ?? "").trim().toLowerCase();

  let filtered = all;
  if (tab === "archived") {
    // Archived view is also where removed (soft-deleted) rooms live, so they
    // remain restorable.
    filtered = filtered.filter((r) => r.status === "archived" || r.status === "removed");
  } else {
    // Every other tab hides removed rooms.
    filtered = filtered.filter((r) => r.status !== "removed");
    if (tab === "active") filtered = filtered.filter((r) => r.status === "active" || r.status === "new");
    else if (tab === "new") filtered = filtered.filter((r) => r.status === "new");
    else if (tab !== "all") filtered = filtered.filter((r) => r.status === tab);
  }

  if (type === "movie") filtered = filtered.filter((r) => r.room_type === "movie_room");
  else if (type === "show") filtered = filtered.filter((r) => r.room_type === "title_room");
  else if (type === "episode") filtered = filtered.filter((r) => r.room_type === "episode_room");

  if (q) filtered = filtered.filter((r) => r.title.toLowerCase().includes(q) || r.creator.toLowerCase().includes(q));

  const total = filtered.length;
  const from = (page - 1) * perPage;
  const rows = filtered.slice(from, from + perPage);

  return { isAdmin: true, rows, total, page, perPage, stats, breakdown, topShows, recentActivity };
});
