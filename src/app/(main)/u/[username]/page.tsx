/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { ShieldCheck, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { timeAgo, posterGradient } from "@/lib/utils";

export const dynamic = "force-dynamic";

function joinedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function mediaTitle(media: any): string {
  if (!media) return "Untitled";
  const m = Array.isArray(media) ? media[0] : media;
  return m?.title ?? "Untitled";
}

async function loadProfile(username: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, favorite_genres, is_admin, created_at")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;

  const count = (q: any): Promise<number> =>
    Promise.resolve(q)
      .then((r: any) => r.count ?? 0)
      .catch(() => 0);

  const [reviews, posts, rooms, followers, following, recentReviews] = await Promise.all([
    count(supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", profile.id)),
    count(supabase.from("comments").select("*", { count: "exact", head: true }).eq("user_id", profile.id)),
    count(supabase.from("watch_status").select("*", { count: "exact", head: true }).eq("user_id", profile.id)),
    count(supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id)),
    count(supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id)),
    Promise.resolve(
      supabase
        .from("reviews")
        .select("id, score, body, spoiler_scope, season_number, episode_number, created_at, media:media_items(title)")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(4),
    )
      .then((r: any) => r.data ?? [])
      .catch(() => []),
  ]);

  return {
    profile: profile as any,
    stats: { reviews, posts, rooms, followers, following },
    recentReviews: recentReviews as any[],
  };
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await loadProfile(username);
  return { title: data ? `${data.profile.display_name} · Watchruum` : "Profile · Watchruum" };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) notFound();

  const { profile, stats, recentReviews } = data;
  const genres: string[] = profile.favorite_genres ?? [];

  const statTiles: { label: string; value: number }[] = [
    { label: "Reviews", value: stats.reviews },
    { label: "Posts", value: stats.posts },
    { label: "Rooms", value: stats.rooms },
    { label: "Followers", value: stats.followers },
    { label: "Following", value: stats.following },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      {/* Header */}
      <div className="glass overflow-hidden rounded-2xl">
        <div className="h-28 w-full" style={{ background: posterGradient(profile.username) }} />
        <div className="px-5 pb-5">
          <div className="-mt-8 flex items-end gap-4">
            <Avatar
              name={profile.display_name}
              src={profile.avatar_url}
              size="lg"
              className="size-20 text-2xl ring-4 ring-bg"
            />
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{profile.display_name}</h1>
              {profile.is_admin && <Badge variant="default">Admin</Badge>}
            </div>
            <p className="text-[13px] text-muted-2">@{profile.username}</p>

            {profile.bio && <p className="mt-3 text-[13px] text-muted">{profile.bio}</p>}

            {genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-border bg-white/5 px-2.5 py-1 text-[12px]"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-3 text-[12px] text-muted-2">Joined {joinedLabel(profile.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {statTiles.map((t) => (
          <div key={t.label} className="glass rounded-2xl p-4">
            <p className="text-2xl font-extrabold">{t.value}</p>
            <p className="text-[12px] text-muted-2">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Recent reviews */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Recent reviews</h2>
        {recentReviews.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-[13px] text-muted-2">No reviews yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {recentReviews.map((r) => (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-foreground">{mediaTitle(r.media)}</p>
                    {(r.season_number != null || r.episode_number != null) && (
                      <p className="text-[12px] text-muted-2">
                        {r.season_number != null && `S${r.season_number}`}
                        {r.episode_number != null && ` · E${r.episode_number}`}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-safe/40 bg-safe/15 px-2.5 py-0.5 text-[12px] font-semibold text-safe">
                    <Star className="size-3" /> {r.score}/10
                  </span>
                </div>
                {r.body && <p className="mt-2 line-clamp-3 text-[13px] text-muted">{r.body}</p>}
                <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-2">
                  {r.spoiler_scope && r.spoiler_scope !== "none" ? (
                    <span className="inline-flex items-center gap-1 text-locked">
                      <ShieldCheck className="size-3" /> Contains spoilers
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-safe">
                      <ShieldCheck className="size-3" /> Spoiler-free
                    </span>
                  )}
                  <span className="text-muted-2/50">·</span>
                  <span>{timeAgo(r.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
