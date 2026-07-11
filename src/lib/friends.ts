import "server-only";
import { createClient } from "./supabase/server";
import { getSampleContent } from "./queries";
import { timeAgo } from "./utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface HubPerson {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  genres: string[];
  mutual: number; // seeded "mutual friends"
  followed: boolean; // whether the viewer follows them
}
export interface HubOnline {
  name: string;
  avatar: string | null;
  room: string;
  members: string;
  status: "online" | "away";
}
export interface HubActivity {
  id: string;
  name: string;
  verb: string;
  target: string;
  score?: number;
  when: string;
}
export interface FriendsHubData {
  signedIn: boolean;
  friends: HubPerson[];
  requests: HubPerson[];
  suggestions: HubPerson[];
  online: HubOnline[];
  activity: HubActivity[];
  counts: { friends: number; online: number; requests: number };
}

// Deterministic small "mutual friends" number so it doesn't flicker.
function seededMutual(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 2 + (h % 12);
}

function seededMembers(i: number): string {
  const n = [1200, 980, 760, 1500, 870, 640, 1100][i % 7];
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n);
}

export async function getFriendsHub(): Promise<FriendsHubData> {
  const sample = await getSampleContent();

  const online: HubOnline[] = sample.friendsOnline.map((f, i) => ({
    name: f.name,
    avatar: f.avatar,
    room: f.room,
    members: seededMembers(i),
    status: f.status,
  }));
  const activity: HubActivity[] = sample.friendActivity.map((a) => ({
    id: a.id,
    name: a.actor.display_name,
    verb: a.verb,
    target: a.target,
    score: a.score,
    when: timeAgo(a.created_at),
  }));

  const empty: FriendsHubData = {
    signedIn: false,
    friends: [],
    requests: [],
    suggestions: [],
    online,
    activity,
    counts: { friends: 0, online: online.length, requests: 0 },
  };

  const supabase = await createClient();
  if (!supabase) return empty;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [{ data: fRows }, { data: myFollowers }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    supabase.from("follows").select("follower_id").eq("following_id", user.id),
  ]);

  const followingIds = ((fRows as any[]) ?? []).map((r) => r.following_id as string);
  const followerIds = ((myFollowers as any[]) ?? []).map((r) => r.follower_id as string);
  const followingSet = new Set(followingIds);
  const requestIds = followerIds.filter((id) => !followingSet.has(id));

  const wanted = Array.from(new Set([...followingIds, ...requestIds]));
  const byId = new Map<string, any>();
  if (wanted.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, favorite_genres, is_private")
      .in("id", wanted);
    for (const p of (data as any[]) ?? []) byId.set(p.id, p);
  }

  const toPerson = (p: any, followed: boolean): HubPerson => ({
    id: p.id,
    username: p.username ?? "member",
    display_name: p.display_name ?? "Member",
    avatar_url: p.avatar_url ?? null,
    genres: p.is_private ? [] : p.favorite_genres ?? [],
    mutual: seededMutual(p.id),
    followed,
  });

  const friends = followingIds.map((id) => byId.get(id)).filter(Boolean).map((p) => toPerson(p, true));
  const requests = requestIds.map((id) => byId.get(id)).filter(Boolean).map((p) => toPerson(p, false));

  // Suggestions: recent members the viewer doesn't already follow / have a request from.
  const exclude = new Set<string>([user.id, ...followingIds, ...requestIds]);
  const { data: recent } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, favorite_genres, is_private")
    .neq("id", user.id)
    .order("created_at", { ascending: false })
    .limit(24);
  const suggestions = ((recent as any[]) ?? [])
    .filter((p) => p.username && !exclude.has(p.id))
    .slice(0, 8)
    .map((p) => toPerson(p, false));

  return {
    signedIn: true,
    friends,
    requests,
    suggestions,
    online,
    activity,
    counts: { friends: friends.length, online: online.length, requests: requests.length },
  };
}
