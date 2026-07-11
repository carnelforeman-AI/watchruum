import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { getLiveMode } from "./settings";
import { getTrendingRooms } from "./queries";
import { timeAgo } from "./utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ModStat {
  key: string;
  value: string;
  label: string;
  sub: string;
}
export interface ModReportRow {
  id: string;
  title: string; // short label ("Spoiler in comment")
  room: string; // where it was reported
  snippet: string; // quoted content
  reporter: string;
  category: string; // Spoiler | Harassment | NSFW | Spam | Other
  tone: string; // color token key
  when: string; // "2m ago"
  isNew: boolean;
}
export interface ModRoomRow {
  id: string;
  title: string;
  members: string;
  online: string;
  alerts: number;
}
export interface ModActionRow {
  id: string;
  actor: string;
  action: string;
  tone: string;
  when: string;
}
export interface ModHealthMetric {
  key: string;
  label: string;
  value: string;
  deltaPct: number;
  up: boolean;
  good: boolean; // is the trend a good thing
}
export interface ModDashboard {
  isMod: boolean;
  live: boolean;
  stats: ModStat[];
  reports: ModReportRow[];
  rooms: ModRoomRow[];
  actions: ModActionRow[];
  health: ModHealthMetric[];
}

/** Map a free-text report reason to a category + colour tone. */
function categorize(reason: string): { category: string; tone: string } {
  const r = (reason || "").toLowerCase();
  if (r.includes("spoiler")) return { category: "Spoiler", tone: "primary" };
  if (r.includes("harass") || r.includes("attack") || r.includes("bully"))
    return { category: "Harassment", tone: "danger" };
  if (r.includes("nsfw") || r.includes("explicit") || r.includes("inappropriate"))
    return { category: "NSFW", tone: "warn" };
  if (r.includes("spam") || r.includes("self-promo") || r.includes("scam"))
    return { category: "Spam", tone: "accent-2" };
  return { category: "Other", tone: "accent" };
}

/* ----------------------------------------------------- demo (mock-up) */

function demoDashboard(): ModDashboard {
  return {
    isMod: true,
    live: false,
    stats: [
      { key: "new", value: "12", label: "New Reports", sub: "Requires your attention" },
      { key: "open", value: "8", label: "In Moderation", sub: "Open cases" },
      { key: "resolved", value: "32", label: "Resolved Today", sub: "Thank you!" },
      { key: "members", value: "2.1K", label: "Active Members", sub: "Across all rooms" },
      { key: "comments", value: "147", label: "Comments", sub: "In last 24h" },
    ],
    reports: [
      { id: "d1", title: "Spoiler in comment", room: "FROM S3E9 Room", snippet: "He dies in the finale…", reporter: "@SarahKim", category: "Spoiler", tone: "primary", when: "2m ago", isNew: true },
      { id: "d2", title: "Harassment", room: "The Boys S4 Room", snippet: "This user keeps attacking everyone…", reporter: "@TomHale", category: "Harassment", tone: "danger", when: "5m ago", isNew: true },
      { id: "d3", title: "Inappropriate content", room: "General Chat", snippet: "NSFW image posted…", reporter: "@JessRivera", category: "NSFW", tone: "warn", when: "12m ago", isNew: true },
      { id: "d4", title: "Spam", room: "Moana 2 Room", snippet: "Repeated links and self-promo…", reporter: "@MikeBoone", category: "Spam", tone: "accent-2", when: "18m ago", isNew: true },
    ],
    rooms: [
      { id: "r1", title: "FROM S3 Room", members: "1.2K", online: "312", alerts: 3 },
      { id: "r2", title: "The Boys S4 Room", members: "980", online: "245", alerts: 2 },
      { id: "r3", title: "House of the Dragon", members: "1.5K", online: "198", alerts: 1 },
      { id: "r4", title: "Silo S1 Room", members: "870", online: "134", alerts: 0 },
      { id: "r5", title: "Moana 2 Room", members: "760", online: "112", alerts: 0 },
    ],
    actions: [
      { id: "a1", actor: "@TomHale", action: "Muted user @DarkKnight", tone: "primary", when: "2m ago" },
      { id: "a2", actor: "@JessRivera", action: "Removed comment in FROM S3E9 Room", tone: "warn", when: "5m ago" },
      { id: "a3", actor: "@MikeBoone", action: "Warned user @SpoilerKing22", tone: "warn", when: "15m ago" },
      { id: "a4", actor: "@SarahModerator", action: "Banned user @ToxicViewer", tone: "danger", when: "1h ago" },
      { id: "a5", actor: "@AlexMod", action: "Locked The Boys S4 Room", tone: "accent", when: "1h ago" },
    ],
    health: [
      { key: "spoiler", label: "Spoiler Reports", value: "24", deltaPct: 15, up: false, good: true },
      { key: "harass", label: "Harassment Reports", value: "7", deltaPct: 30, up: false, good: true },
      { key: "rate", label: "Resolved Rate", value: "94%", deltaPct: 12, up: true, good: true },
      { key: "response", label: "Average Response Time", value: "18m", deltaPct: 10, up: false, good: true },
    ],
  };
}

/* ----------------------------------------------------- real (live mode) */

const empty: ModDashboard = { isMod: false, live: false, stats: [], reports: [], rooms: [], actions: [], health: [] };

export const getModDashboard = cache(async (): Promise<ModDashboard> => {
  const supabase = await createClient();
  if (!supabase) return { ...demoDashboard(), isMod: true };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;
  const { data: me } = await supabase.from("profiles").select("is_admin, is_moderator").eq("id", user.id).maybeSingle();
  const prof = me as { is_admin?: boolean; is_moderator?: boolean } | null;
  if (!prof?.is_admin && !prof?.is_moderator) return empty;

  const live = await getLiveMode();
  if (!live) return demoDashboard();

  // ---- real data ----
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const todayIso = startToday.toISOString();

  const countBy = async (status?: string, sinceCol?: string, since?: string) => {
    let q = supabase.from("reports").select("id", { count: "exact", head: true });
    if (status) q = q.eq("status", status);
    if (sinceCol && since) q = q.gte(sinceCol, since);
    const { count } = await q;
    return count ?? 0;
  };

  const [newReports, inMod, resolvedToday, members, comments24h] = await Promise.all([
    countBy("open"),
    countBy("reviewing"),
    countBy("resolved", "created_at", todayIso),
    supabase.from("profiles").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0),
    supabase.from("comments").select("id", { count: "exact", head: true }).gte("created_at", dayAgo).then((r) => r.count ?? 0),
  ]);

  // Open reports needing attention (real).
  const { data: rr } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_profiles_fkey(display_name, username)")
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(6);
  const rows = (rr ?? []) as any[];

  const cIds = rows.filter((r) => r.target_type === "comment").map((r) => r.target_id);
  const vIds = rows.filter((r) => r.target_type === "review").map((r) => r.target_id);
  const [{ data: cRows }, { data: vRows }] = await Promise.all([
    cIds.length ? supabase.from("comments").select("id, body, media:media_items(title)").in("id", cIds) : Promise.resolve({ data: [] as any[] }),
    vIds.length ? supabase.from("reviews").select("id, body, media:media_items(title)").in("id", vIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const info = new Map<string, { body: string; title: string }>();
  for (const c of (cRows ?? []) as any[]) info.set(c.id, { body: c.body ?? "", title: c.media?.title ?? "a room" });
  for (const v of (vRows ?? []) as any[]) info.set(v.id, { body: v.body ?? "", title: v.media?.title ?? "a title" });

  const reports: ModReportRow[] = rows.map((r) => {
    const cat = categorize(r.reason);
    const meta = info.get(r.target_id);
    const snippet = (meta?.body ?? r.reason ?? "").slice(0, 60);
    return {
      id: r.id,
      title: r.reason || cat.category,
      room: meta?.title ? `${meta.title} Room` : r.target_type === "review" ? "a review" : "a room",
      snippet: snippet ? `${snippet}${(meta?.body?.length ?? 0) > 60 ? "…" : ""}` : "Reported content",
      reporter: r.reporter?.username ? `@${r.reporter.username}` : r.reporter?.display_name ?? "Someone",
      category: cat.category,
      tone: cat.tone,
      when: timeAgo(r.created_at),
      isNew: r.status === "open",
    };
  });

  // Active rooms (real trending) — alerts are 0 until a live alerts source exists.
  let rooms: ModRoomRow[] = [];
  try {
    const tr = await getTrendingRooms(5);
    rooms = tr.map((r) => ({
      id: r.id,
      title: r.media.title,
      members: String(r.active_users),
      online: String(Math.round(r.active_users * 0.2)),
      alerts: 0,
    }));
  } catch {
    rooms = [];
  }

  // Recent mod actions from real warnings, if any.
  let actions: ModActionRow[] = [];
  try {
    const { data: warns } = await supabase
      .from("user_warnings")
      .select("id, reason, created_at, target:profiles!user_warnings_user_id_fkey(username)")
      .order("created_at", { ascending: false })
      .limit(5);
    actions = ((warns as any[]) ?? []).map((w) => ({
      id: w.id,
      actor: "Moderator",
      action: `Warned @${w.target?.username ?? "user"} — ${w.reason ?? "guideline"}`,
      tone: "warn",
      when: timeAgo(w.created_at),
    }));
  } catch {
    actions = [];
  }

  const spoilerReports = (await supabase.from("reports").select("id", { count: "exact", head: true }).ilike("reason", "%spoiler%").gte("created_at", dayAgo)).count ?? 0;
  const harassReports = (await supabase.from("reports").select("id", { count: "exact", head: true }).ilike("reason", "%harass%").gte("created_at", dayAgo)).count ?? 0;
  const resolvedTotal = await countBy("resolved");
  const allReports = await countBy();
  const resolvedRate = allReports > 0 ? Math.round((resolvedTotal / allReports) * 100) : 0;

  const health: ModHealthMetric[] = [
    { key: "spoiler", label: "Spoiler Reports", value: String(spoilerReports), deltaPct: 0, up: false, good: true },
    { key: "harass", label: "Harassment Reports", value: String(harassReports), deltaPct: 0, up: false, good: true },
    { key: "rate", label: "Resolved Rate", value: `${resolvedRate}%`, deltaPct: 0, up: true, good: true },
    { key: "response", label: "Average Response Time", value: "—", deltaPct: 0, up: false, good: true },
  ];

  const compactN = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n));

  return {
    isMod: true,
    live: true,
    stats: [
      { key: "new", value: String(newReports), label: "New Reports", sub: "Requires your attention" },
      { key: "open", value: String(inMod), label: "In Moderation", sub: "Open cases" },
      { key: "resolved", value: String(resolvedToday), label: "Resolved Today", sub: "Thank you!" },
      { key: "members", value: compactN(members), label: "Active Members", sub: "Across all rooms" },
      { key: "comments", value: compactN(comments24h), label: "Comments", sub: "In last 24h" },
    ],
    reports,
    rooms,
    actions,
    health,
  };
});
