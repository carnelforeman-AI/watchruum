"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify/fanout";
import { searchMedia } from "@/lib/tmdb";
import type { LobbyPost, TitleHit } from "@/lib/lobby-types";

/** Search the catalog to tag a title in a post. */
export async function searchTitles(query: string): Promise<TitleHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const results = await searchMedia(q);
    return results.slice(0, 6).map((m) => ({
      id: m.id,
      title: m.title,
      type: m.media_type,
      poster: m.poster_url,
      year: m.release_year,
    }));
  } catch {
    return [];
  }
}

type PostInput = {
  body?: string | null;
  spoiler?: boolean;
  mediaId?: string | null;
  mediaTitle?: string | null;
  mediaType?: string | null;
  imageUrl?: string | null;
  replyTo?: string | null;
};

type PostResult = { ok: true; post: LobbyPost } | { ok: false; error: string };

/** Create a Lobby post (or a reply, when replyTo is set). */
export async function createLobbyPost(input: PostInput): Promise<PostResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Not available." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const body = (input.body ?? "").trim().slice(0, 1000);
  const hasImage = !!input.imageUrl;
  if (!body && !hasImage) return { ok: false, error: "Say something first." };

  const row = {
    user_id: user.id,
    body: body || null,
    spoiler: !!input.spoiler,
    media_id: input.mediaId ?? null,
    media_title: input.mediaTitle ?? null,
    media_type: input.mediaType ?? null,
    image_url: input.imageUrl ?? null,
    reply_to: input.replyTo ?? null,
  };

  const { data, error } = await supabase.from("lobby_posts").insert(row).select("id, created_at").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not post." };

  // Notify the parent author on a reply.
  if (input.replyTo) {
    const { data: parent } = await supabase.from("lobby_posts").select("user_id").eq("id", input.replyTo).maybeSingle();
    const authorId = (parent as { user_id?: string } | null)?.user_id;
    if (authorId && authorId !== user.id) {
      const { data: me } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      const name = (me as { display_name?: string } | null)?.display_name ?? "Someone";
      await notify(authorId, { type: "reply", message: `${name} replied to your post in The Lobby`, link: "/lobby" });
    }
  }

  revalidatePath("/lobby");

  const d = data as { id: string; created_at: string };
  const { data: prof } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, is_tester")
    .eq("id", user.id)
    .maybeSingle();
  const p = prof as { username?: string; display_name?: string; avatar_url?: string | null; is_tester?: boolean } | null;

  return {
    ok: true,
    post: {
      id: d.id,
      author: {
        username: p?.username ?? "you",
        display_name: p?.display_name ?? "You",
        avatar_url: p?.avatar_url ?? null,
        is_tester: p?.is_tester,
      },
      body: body || null,
      spoiler: !!input.spoiler,
      media: input.mediaId ? { id: input.mediaId, title: input.mediaTitle ?? "", type: input.mediaType ?? "tv" } : null,
      image_url: input.imageUrl ?? null,
      created_at: d.created_at,
      replyTo: input.replyTo ?? null,
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      liked: false,
      reposted: false,
      bookmarked: false,
    },
  };
}

async function toggle(
  table: "lobby_likes" | "lobby_reposts" | "lobby_bookmarks",
  postId: string,
  on: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Not available." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  if (on) {
    const { error } = await supabase.from(table).upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id" });
    return { ok: !error, error: error?.message };
  }
  const { error } = await supabase.from(table).delete().eq("post_id", postId).eq("user_id", user.id);
  return { ok: !error, error: error?.message };
}

export async function toggleLobbyLike(postId: string, on: boolean) {
  const res = await toggle("lobby_likes", postId, on);
  // Best-effort like notification.
  if (res.ok && on) {
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: post } = await supabase.from("lobby_posts").select("user_id").eq("id", postId).maybeSingle();
      const authorId = (post as { user_id?: string } | null)?.user_id;
      if (user && authorId && authorId !== user.id) {
        const { data: me } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
        const name = (me as { display_name?: string } | null)?.display_name ?? "Someone";
        await notify(authorId, { type: "like", message: `${name} liked your post in The Lobby`, link: "/lobby" });
      }
    }
  }
  return res;
}

export async function toggleLobbyRepost(postId: string, on: boolean) {
  return toggle("lobby_reposts", postId, on);
}

export async function toggleLobbyBookmark(postId: string, on: boolean) {
  return toggle("lobby_bookmarks", postId, on);
}

/** Load the replies to a post (oldest first). */
export async function getLobbyReplies(postId: string): Promise<LobbyPost[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("lobby_feed")
    .select("*")
    .eq("reply_to", postId)
    .order("created_at", { ascending: true })
    .limit(50);
  type Row = Parameters<typeof mapRow>[0];
  return ((data as Row[] | null) ?? []).map(mapRow);
}

// Local mapper (kept here to avoid importing a server-only module into a client).
function mapRow(r: {
  id: string;
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
}): LobbyPost {
  return {
    id: r.id,
    author: { username: r.username, display_name: r.display_name, avatar_url: r.avatar_url, is_tester: !!r.is_tester },
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
