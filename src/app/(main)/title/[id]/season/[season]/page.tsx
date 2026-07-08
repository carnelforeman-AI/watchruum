import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Play, MessageCircle } from "lucide-react";
import { getMedia, getEpisodes } from "@/lib/tmdb";
import { Poster } from "@/components/media/poster";
import { posterGradient } from "@/lib/utils";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ id: string; season: string }>;
}) {
  const { id, season } = await params;
  const seasonNum = Number(season);
  const media = await getMedia(id);
  if (!media) notFound();
  const episodes = await getEpisodes(id, seasonNum);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <Link
        href={`/title/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {media.title}
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight">
        {media.title} <span className="text-muted">· Season {seasonNum}</span>
      </h1>
      <p className="mt-1 text-[13px] text-muted-2">{episodes.length} episodes</p>

      <div className="mt-5 space-y-3">
        {episodes.map((e) => (
          <Link
            key={e.id}
            href={`/title/${id}/season/${seasonNum}/episode/${e.episode_number}`}
            className="glass glass-hover flex items-center gap-4 rounded-2xl p-3"
          >
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl">
              {e.still_url ? (
                <Poster title={e.name} src={e.still_url} showTitle={false} rounded="rounded-xl" className="h-full w-full" />
              ) : (
                <div className="h-full w-full" style={{ background: posterGradient(`${media.title} ${seasonNum} ${e.episode_number}`) }} />
              )}
              <div className="absolute inset-0 grid place-items-center bg-black/20">
                <Play className="size-6 fill-white/90 text-white/90" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-primary">Episode {e.episode_number}</p>
              <p className="truncate font-bold">{e.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{e.overview}</p>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 self-start text-[12px] text-muted-2 sm:flex">
              <MessageCircle className="size-3.5" /> Room
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
