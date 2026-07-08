import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { getMedia, getEpisode, getEpisodes } from "@/lib/tmdb";
import { getCurrentProfile, createClient } from "@/lib/supabase/server";
import { EpisodeRoom } from "@/components/room/episode-room";
import { EpisodePicker } from "@/components/room/episode-picker";
import { Poster } from "@/components/media/poster";
import { Badge } from "@/components/ui/badge";
import { commentsFor } from "@/lib/mock-data";
import { posterGradient } from "@/lib/utils";
import type { Comment } from "@/lib/types";

export default async function EpisodePage({
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

  // Load real data if signed in + configured; otherwise demo mock.
  let initiallyWatched = false;
  const comments: Comment[] = commentsFor(id, seasonNum, epNum);

  const profile = await getCurrentProfile();
  if (profile) {
    const supabase = await createClient();
    if (supabase) {
      const { data: w } = await supabase
        .from("episode_watches")
        .select("id")
        .eq("user_id", profile.id)
        .eq("season_number", seasonNum)
        .eq("episode_number", epNum)
        .maybeSingle();
      initiallyWatched = !!w;
    }
  }

  const prev = epNum > 1 ? epNum - 1 : null;
  const next = episodes.some((e) => e.episode_number === epNum + 1) ? epNum + 1 : null;
  const base = `/title/${id}/season/${seasonNum}/episode`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <Link
        href={`/title/${id}/season/${seasonNum}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {media.title} · Season {seasonNum}
      </Link>

      {/* Episode header */}
      <div className="glass overflow-hidden rounded-2xl">
        <div className="relative h-44 md:h-56">
          {episode.still_url ? (
            <Poster title={episode.name} src={episode.still_url} showTitle={false} rounded="rounded-none" className="h-full w-full" />
          ) : (
            <div className="h-full w-full" style={{ background: posterGradient(`${media.title} ${seasonNum} ${epNum}`) }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5">
            <Badge>S{seasonNum} · E{epNum}</Badge>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight drop-shadow">{episode.name}</h1>
            <p className="text-[13px] text-white/70">{media.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 p-5 text-[13px] text-muted">
          {episode.air_date && (
            <span className="flex items-center gap-1.5"><Calendar className="size-4" /> {episode.air_date}</span>
          )}
          {episode.runtime && (
            <span className="flex items-center gap-1.5"><Clock className="size-4" /> {episode.runtime}m</span>
          )}
        </div>
        {episode.overview && (
          <p className="px-5 pb-5 text-[14px] leading-relaxed text-foreground/85">{episode.overview}</p>
        )}
      </div>

      {/* Episode navigation */}
      <div className="mt-4 flex items-center justify-between gap-3">
        {prev ? (
          <Link href={`${base}/${prev}`} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/5 px-3 py-2 text-[13px] font-semibold hover:bg-white/10">
            <ChevronLeft className="size-4" /> Episode {prev}
          </Link>
        ) : <span />}
        <EpisodePicker id={id} season={seasonNum} current={epNum} total={episodes.length} />
        {next ? (
          <Link href={`${base}/${next}`} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/5 px-3 py-2 text-[13px] font-semibold hover:bg-white/10">
            Episode {next} <ChevronRight className="size-4" />
          </Link>
        ) : <span />}
      </div>

      <div className="mt-6">
        <EpisodeRoom
          media={media}
          season={seasonNum}
          episode={epNum}
          initialComments={comments}
          initiallyWatched={initiallyWatched}
        />
      </div>
    </div>
  );
}
