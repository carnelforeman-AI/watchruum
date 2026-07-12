import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Settings, UserPlus, ShieldCheck } from "lucide-react";
import { getMedia, getEpisode, getEpisodes } from "@/lib/tmdb";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getRoomFeed } from "@/lib/queries";
import { getRoomThreads, getRoomPolls, getRoomMedia } from "@/lib/room-tabs";
import { RoomChat } from "@/components/room/room-chat";
import { EpisodeNav } from "@/components/room/episode-nav";
import { RoomRail } from "@/components/room/room-rail";
import { RoomTabs } from "@/components/room/room-tabs";
import { RoomPresence } from "@/components/room/room-presence";
import { SafeZonePill } from "@/components/room/spoiler-standard";
import { scopeLabel } from "@/lib/spoiler";
import { Avatar } from "@/components/ui/avatar";
import { compact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EpisodeRoomPage({
  params,
}: {
  params: Promise<{ id: string; season: string; ep: string }>;
}) {
  const { id, season, ep } = await params;
  const seasonNum = Number(season);
  const epNum = Number(ep);

  const [media, episode, episodes] = await Promise.all([
    getMedia(id),
    getEpisode(id, seasonNum, epNum),
    getEpisodes(id, seasonNum),
  ]);
  if (!media || !episode) notFound();

  const [profile, feed, threads, polls, mediaItems] = await Promise.all([
    getCurrentProfile(),
    getRoomFeed(media.tmdb_id, media.media_type, seasonNum, epNum),
    getRoomThreads(media.tmdb_id, media.media_type, seasonNum, epNum),
    getRoomPolls(media.tmdb_id, media.media_type, seasonNum, epNum),
    getRoomMedia(media.tmdb_id, media.media_type, seasonNum, epNum),
  ]);

  const safeLabel = scopeLabel(seasonNum, epNum); // "S2 E4"
  const base = `/title/${id}/season/${seasonNum}/episode`;

  // Viewer's furthest watched episode within this season, for the navigator.
  let furthestEpisode: number | null = null;
  if (feed.progress) {
    if (feed.progress.season_number === seasonNum) furthestEpisode = feed.progress.episode_number;
    else if ((feed.progress.season_number ?? 0) > seasonNum) furthestEpisode = episodes.length;
  }

  const topChatters = feed.members.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-6">
      <RoomPresence
        enabled={!!profile && profile.show_activity !== false}
        userId={profile?.id ?? null}
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? "A fan"}
        avatar={profile?.avatar_url ?? null}
        room={media.title}
        roomHref={`${base}/${epNum}`}
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
        <Link href={`/title/${id}/season/${seasonNum}`} className="hover:text-foreground">
          Season {seasonNum}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Episode {epNum} – {episode.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-[28px]">
            {media.title} {safeLabel} – {episode.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
            <SafeZonePill />
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
          season: seasonNum,
          episode: epNum,
          isMovie: false,
          safeLabel,
          viewerId: feed.viewerId,
          viewerName: profile?.display_name ?? null,
          progress: feed.progress,
        }}
        about={{
          titleId: id,
          title: media.title,
          isMovie: false,
          releaseYear: media.release_year ?? null,
          safeLabel,
          spoilerLine: `Safe up to Season ${seasonNum}, Episode ${epNum}.`,
          memberCount: feed.memberCount,
          onlineCount: feed.onlineCount,
          createdBy: feed.createdBy,
        }}
        threads={threads}
        polls={polls}
        mediaItems={mediaItems}
        leftRail={
          <EpisodeNav
            media={{ id, title: media.title, poster_url: media.poster_url }}
            season={seasonNum}
            currentEpisode={epNum}
            seasonName={episode.name}
            episodes={episodes.map((e) => ({ episode_number: e.episode_number, name: e.name }))}
            watchedEpisodes={feed.watchedEpisodes}
            furthestEpisode={furthestEpisode}
          />
        }
        rightRail={
          <RoomRail
            media={media}
            season={seasonNum}
            episode={epNum}
            episodeName={episode.name}
            safeLabel={safeLabel}
            members={feed.members}
            memberCount={feed.memberCount}
            createdBy={feed.createdBy}
          />
        }
        chat={
          <RoomChat
            media={media}
            season={seasonNum}
            episode={epNum}
            safeLabel={safeLabel}
            initialMessages={feed.messages}
            viewerId={feed.viewerId}
            viewerName={profile?.display_name ?? null}
            viewerLang={profile?.preferred_language ?? null}
            progress={feed.progress}
            watchedThisEpisode={feed.watchedThisEpisode}
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
