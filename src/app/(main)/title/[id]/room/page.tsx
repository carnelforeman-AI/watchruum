import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, Settings, UserPlus, ShieldCheck } from "lucide-react";
import { getMedia } from "@/lib/tmdb";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getRoomFeed } from "@/lib/queries";
import { getRoomThreads, getRoomPolls, getRoomMedia } from "@/lib/room-tabs";
import { RoomChat } from "@/components/room/room-chat";
import { RoomRail } from "@/components/room/room-rail";
import { RoomTabs } from "@/components/room/room-tabs";
import { RoomPresence } from "@/components/room/room-presence";
import { SafeZonePill } from "@/components/room/spoiler-standard";
import { Avatar } from "@/components/ui/avatar";
import { compact } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const media = await getMedia(id);
  if (!media) return { title: "Watch Room" };
  return {
    title: `${media.title} — Watch Room`,
    description: `Join the spoiler-safe watch room for ${media.title}. Discuss, rate, and react with fans at your exact episode — without getting spoiled.`,
    alternates: { canonical: `/title/${id}/room` },
  };
}

export default async function MovieRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await getMedia(id);
  if (!media) notFound();
  // Rooms for shows live at the episode level; send TV titles back to the title page.
  if (media.media_type !== "movie") redirect(`/title/${id}`);

  const [profile, feed, threads, polls, mediaItems] = await Promise.all([
    getCurrentProfile(),
    getRoomFeed(media.tmdb_id, media.media_type, null, null),
    getRoomThreads(media.tmdb_id, media.media_type, null, null),
    getRoomPolls(media.tmdb_id, media.media_type, null, null),
    getRoomMedia(media.tmdb_id, media.media_type, null, null),
  ]);

  const topChatters = feed.members.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
      <RoomPresence
        enabled={!!profile && profile.show_activity !== false}
        userId={profile?.id ?? null}
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? "A fan"}
        avatar={profile?.avatar_url ?? null}
        room={media.title}
        roomHref={`/title/${id}/room`}
      />
      {/* Breadcrumb */}
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-2">
        <Link href="/rooms" className="font-semibold text-muted hover:text-foreground">
          Back to Rooms
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/title/${id}`} className="hover:text-foreground">
          {media.title}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Movie Room</span>
      </nav>

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-[28px]">{media.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
            <SafeZonePill />
            <span className="text-muted-2">·</span>
            <span>{["Movie", media.release_year].filter(Boolean).join(" · ")}</span>
            <span className="text-muted-2">·</span>
            <span>{compact(feed.memberCount)} Members</span>
            <span className="text-muted-2">·</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-safe" /> {compact(feed.onlineCount)} Online
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-3.5 py-2 text-[13px] font-semibold text-white hover:brightness-110">
            <Settings className="size-4" /> Room Settings
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold hover:bg-white/[0.07]">
            <UserPlus className="size-4" /> Invite
          </button>
        </div>
      </div>

      {/* Room activity tabs */}
      <RoomTabs
        ctx={{
          media,
          season: null,
          episode: null,
          isMovie: true,
          safeLabel: "",
          viewerId: feed.viewerId,
          viewerName: profile?.display_name ?? null,
          progress: feed.progress,
        }}
        about={{
          titleId: id,
          title: media.title,
          isMovie: true,
          releaseYear: media.release_year ?? null,
          safeLabel: "",
          spoilerLine: "Safe once you've finished the film.",
          memberCount: feed.memberCount,
          onlineCount: feed.onlineCount,
          createdBy: feed.createdBy,
        }}
        threads={threads}
        polls={polls}
        mediaItems={mediaItems}
        rightRail={
          <RoomRail
            media={media}
            season={null}
            episode={null}
            episodeName=""
            safeLabel=""
            members={feed.members}
            memberCount={feed.memberCount}
            createdBy={feed.createdBy}
            isMovie
          />
        }
        chat={
          <RoomChat
            media={media}
            season={null}
            episode={null}
            safeLabel=""
            initialMessages={feed.messages}
            viewerId={feed.viewerId}
            viewerName={profile?.display_name ?? null}
            viewerLang={profile?.preferred_language ?? null}
            progress={feed.progress}
            watchedThisEpisode={feed.watchedThisEpisode}
            isMovie
          />
        }
      />

      {/* Bottom bar */}
      <div className="glass mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-5 py-3.5">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="size-2 rounded-full bg-safe" /> {compact(feed.onlineCount)} Online now
        </span>
        {topChatters.length > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Top Chatters</span>
            {topChatters.map((m, i) => (
              <Link key={m.id} href={`/u/${m.username}`} className="flex items-center gap-2 hover:opacity-90">
                <Avatar name={m.display_name} src={m.avatar_url} size="sm" />
                <span className="text-[13px]">
                  <span className="font-semibold">#{i + 1} {m.display_name}</span>{" "}
                  <span className="text-muted-2">{compact(m.message_count)} msgs</span>
                </span>
              </Link>
            ))}
          </div>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold text-muted">
          <ShieldCheck className="size-4 text-warn" /> Room Rules
        </span>
      </div>
    </div>
  );
}
