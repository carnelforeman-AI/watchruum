import "server-only";
import { createClient } from "./supabase/server";
import { getLiveMode } from "./settings";
import { trending } from "./tmdb";
import { getUserLibrary } from "./queries";
import type { LobbyAuthor, LobbyPost, LobbyTrend, LobbySuggestion, LobbyData } from "./lobby-types";

export type { LobbyAuthor, LobbyPost, LobbyTrend, LobbySuggestion, LobbyData } from "./lobby-types";

/* ------------------------------------------------------------------ */
/* View row → LobbyPost                                                */
/* ------------------------------------------------------------------ */
type FeedRow = {
  id: string;
  user_id: string;
  body: string | null;
  spoiler: boolean;
  media_id: string | null;
  media_title: string | null;
  media_type: string | null;
  image_url: string | null;
  reply_to: string | null;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_tester: boolean | null;
  like_count: number;
  repost_count: number;
  reply_count: number;
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
};

function rowToPost(r: FeedRow): LobbyPost {
  return {
    id: r.id,
    author: {
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      is_tester: !!r.is_tester,
    },
    body: r.body,
    spoiler: r.spoiler,
    media: r.media_id ? { id: r.media_id, title: r.media_title ?? "", type: r.media_type ?? "tv" } : null,
    image_url: r.image_url,
    created_at: r.created_at,
    replyTo: r.reply_to,
    likeCount: Number(r.like_count) || 0,
    repostCount: Number(r.repost_count) || 0,
    replyCount: Number(r.reply_count) || 0,
    liked: !!r.liked,
    reposted: !!r.reposted,
    bookmarked: !!r.bookmarked,
  };
}

/* ------------------------------------------------------------------ */
/* Seeded placeholder content (pre-launch / demo mode)                 */
/* ------------------------------------------------------------------ */
const SEED_AUTHORS: (LobbyAuthor & { superfan?: boolean })[] = [
  { username: "lenapark", display_name: "Lena Park", avatar_url: null, is_tester: true },
  { username: "marcusreed", display_name: "Marcus Reed", avatar_url: null },
  { username: "jazzyreviews", display_name: "Jazzy", avatar_url: null },
  { username: "cinephile_88", display_name: "Dev Rao", avatar_url: null },
  { username: "emilyonfilm", display_name: "Emily Carter", avatar_url: null },
];

const SEED_BODIES: { body: string; spoiler?: boolean; useMedia?: boolean }[] = [
  { body: "That ending in {title} 😳 I need answers NOW.", spoiler: true, useMedia: true },
  { body: "The new trailer for {title} looks absolutely insane. Can't come soon enough.", useMedia: true },
  { body: "Just finished {title}. That finale… chills. What did everyone think?", useMedia: true },
  { body: "Hot take: {title} is the best thing on TV right now and it's not close.", useMedia: true },
  { body: "Rewatching {title} for the third time and still catching new details. This fandom gets it.", useMedia: true },
  { body: "Who else is doing a weekend binge? Drop what you're watching 👇" },
];

async function seededPosts(): Promise<LobbyPost[]> {
  let titles: Awaited<ReturnType<typeof trending>> = [];
  try {
    titles = await trending();
  } catch {
    titles = [];
  }
  const pick = (i: number) => titles[i % Math.max(1, titles.length)];
  const times = ["15m", "32m", "1h", "2h", "4h", "6h"];
  const likes = [128, 342, 89, 512, 76, 203];
  const reposts = [12, 48, 11, 64, 9, 27];
  const replies = [24, 36, 57, 91, 14, 40];

  return SEED_BODIES.map((s, i) => {
    const a = SEED_AUTHORS[i % SEED_AUTHORS.length];
    const t = pick(i);
    const title = t?.title ?? "this show";
    return {
      id: `seed-${i}`,
      author: a,
      body: s.body.replace("{title}", title),
      spoiler: !!s.spoiler,
      media: s.useMedia && t ? { id: t.id, title: t.title, type: t.media_type } : null,
      image_url: null,
      created_at: times[i % times.length],
      replyTo: null,
      likeCount: likes[i % likes.length],
      repostCount: reposts[i % reposts.length],
      replyCount: replies[i % replies.length],
      liked: false,
      reposted: false,
      bookmarked: false,
      demo: true,
    };
  });
}

async function trendsFromTitles(): Promise<LobbyTrend[]> {
  let titles: Awaited<ReturnType<typeof trending>> = [];
  try {
    titles = await trending();
  } catch {
    titles = [];
  }
  const counts = [12300, 9482, 6210, 5432, 3908, 2341];
  return titles.slice(0, 6).map((t, i) => ({
    label: "#" + t.title.replace(/[^A-Za-z0-9]/g, ""),
    category: t.media_type === "movie" ? "Trending in Movies" : "Trending in TV",
    posts: counts[i % counts.length],
    poster: t.poster_url,
  }));
}

const SEED_SUGGESTIONS: LobbySuggestion[] = [
  { username: "emilyonfilm", display_name: "Emily Carter", avatar_url: null },
  { username: "thefilmhype", display_name: "Film Hype", avatar_url: null },
  { username: "nowstreaming", display_name: "Now Streaming", avatar_url: null },
];

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */
export async function getLobbyData(): Promise<LobbyData> {
  const [live, lib] = await Promise.all([getLiveMode(), getUserLibrary()]);
  const signedIn = !!lib;
  const me: LobbyAuthor | null = lib?.profile
    ? {
        username: lib.profile.username ?? "you",
        display_name: lib.profile.display_name,
        avatar_url: lib.profile.avatar_url,
        is_tester: lib.profile.is_tester,
      }
    : null;

  const trends = await trendsFromTitles();

  // Pre-launch (or Supabase absent): seeded placeholders so the Lobby looks alive.
  if (!live) {
    return {
      live: false,
      signedIn,
      me,
      posts: await seededPosts(),
      followingIds: [],
      trends,
      suggestions: SEED_SUGGESTIONS,
    };
  }

  // Live: real feed from the view.
  const supabase = await createClient();
  let posts: LobbyPost[] = [];
  let followingIds: string[] = [];
  let suggestions: LobbySuggestion[] = SEED_SUGGESTIONS;

  if (supabase) {
    const { data } = await supabase
      .from("lobby_feed")
      .select("*")
      .is("reply_to", null)
      .order("created_at", { ascending: false })
      .limit(50);
    posts = ((data as FeedRow[] | null) ?? []).map(rowToPost);

    if (me) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        followingIds = ((f as { following_id: string }[] | null) ?? []).map((r) => r.following_id);

        // Who to follow: a few real members you don't already follow.
        const exclude = new Set([user.id, ...followingIds]);
        const { data: people } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .limit(12);
        const real = ((people as (LobbySuggestion & { id?: string })[] | null) ?? [])
          .filter((p) => p.username && !exclude.has(p.id ?? ""))
          .slice(0, 3);
        if (real.length) suggestions = real;
      }
    }
  }

  return { live: true, signedIn, me, posts, followingIds, trends, suggestions };
}
