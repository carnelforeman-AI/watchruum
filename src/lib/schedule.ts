import "server-only";
import { createClient } from "./supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ScheduleParty {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: string; // invited | going | maybe | declined
}

export interface ScheduledWatch {
  id: string;
  titleId: string; // routeId for /title/[id]
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_url: string | null;
  season_number: number | null;
  episode_number: number | null;
  scheduled_at: string;
  note: string | null;
  is_party: boolean;
  isHost: boolean;
  host: { username: string; display_name: string; avatar_url: string | null };
  myRsvp: string | null; // my invite status if I'm an invitee
  invitees: ScheduleParty[];
  notify: boolean; // will I get a "starting soon" reminder for this? (false = muted)
}

export interface MySchedule {
  signedIn: boolean;
  upcoming: ScheduledWatch[]; // watches I host or accepted, in the future
  invites: ScheduledWatch[]; // parties I'm invited to but haven't answered
}

import { routeId } from "./utils";

const HOST = "host:profiles!scheduled_watches_host_id_fkey(username, display_name, avatar_url)";

function mapRow(r: any, meId: string, mutedIds: Set<string>): ScheduledWatch {
  const invitees: ScheduleParty[] = ((r.invites as any[]) ?? []).map((i) => ({
    id: i.user?.id ?? i.user_id ?? "",
    username: i.user?.username ?? "member",
    display_name: i.user?.display_name ?? "Member",
    avatar_url: i.user?.avatar_url ?? null,
    status: i.status ?? "invited",
  }));
  const mine = ((r.invites as any[]) ?? []).find((i) => (i.user?.id ?? i.user_id) === meId);
  return {
    id: r.id,
    titleId: routeId(r.media_type, r.tmdb_id, r.title),
    tmdb_id: r.tmdb_id,
    media_type: r.media_type,
    title: r.title,
    poster_url: r.poster_url ?? null,
    season_number: r.season_number,
    episode_number: r.episode_number,
    scheduled_at: r.scheduled_at,
    note: r.note ?? null,
    is_party: !!r.is_party,
    isHost: r.host_id === meId,
    host: {
      username: r.host?.username ?? "member",
      display_name: r.host?.display_name ?? "Member",
      avatar_url: r.host?.avatar_url ?? null,
    },
    myRsvp: mine?.status ?? null,
    invitees,
    notify: !mutedIds.has(r.id),
  };
}

/** The signed-in user's upcoming scheduled watches + pending party invites. */
export async function getMySchedule(): Promise<MySchedule> {
  const supabase = await createClient();
  if (!supabase) return { signedIn: false, upcoming: [], invites: [] };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, upcoming: [], invites: [] };
  const me = user.id;
  const nowIso = new Date().toISOString();

  const select = `id, host_id, tmdb_id, media_type, title, poster_url, season_number, episode_number, scheduled_at, note, is_party, ${HOST}, invites:scheduled_watch_invites(status, user_id, user:profiles!scheduled_watch_invites_user_id_fkey(id, username, display_name, avatar_url))`;

  // RLS already limits rows to ones I host or am invited to. Fetch upcoming.
  const { data } = await supabase
    .from("scheduled_watches")
    .select(select)
    .gte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(100);

  // Which of these watches have I muted? (presence = no reminder for me)
  const scheduleIds = ((data as any[]) ?? []).map((r) => r.id);
  const mutedIds = new Set<string>();
  if (scheduleIds.length) {
    const { data: mutes } = await supabase
      .from("scheduled_watch_mutes")
      .select("schedule_id")
      .eq("user_id", me)
      .in("schedule_id", scheduleIds);
    for (const m of ((mutes as any[]) ?? [])) mutedIds.add(m.schedule_id);
  }

  const rows = ((data as any[]) ?? []).map((r) => mapRow(r, me, mutedIds));

  const upcoming = rows.filter((r) => r.isHost || r.myRsvp === "going" || r.myRsvp === "maybe");
  const invites = rows.filter((r) => !r.isHost && r.myRsvp === "invited");

  return { signedIn: true, upcoming, invites };
}
