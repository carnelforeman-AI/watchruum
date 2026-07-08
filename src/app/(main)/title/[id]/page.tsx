import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Layers, Users, Star } from "lucide-react";
import { getMedia, getSeasons } from "@/lib/tmdb";
import { Poster } from "@/components/media/poster";
import { Badge } from "@/components/ui/badge";
import { TitleActions, ShowRating } from "@/components/media/title-actions";
import { posterGradient, compact } from "@/lib/utils";

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await getMedia(id);
  if (!media) notFound();

  const seasons = media.media_type === "tv" ? await getSeasons(id) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      {/* Backdrop */}
      <div className="relative -mx-4 -mt-6 mb-6 h-56 overflow-hidden md:-mx-6 md:h-72">
        <div className="absolute inset-0" style={{ background: posterGradient(media.title) }} />
        {media.backdrop_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.backdrop_url} alt="" className="h-full w-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <Poster
          title={media.title}
          src={media.poster_url}
          showTitle={!media.poster_url}
          className="h-56 w-40 shrink-0 self-center md:self-start"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={media.media_type === "tv" ? "default" : "neutral"}>
              {media.media_type === "tv" ? "TV Show" : "Movie"}
            </Badge>
            {media.genres.slice(0, 3).map((g) => (
              <Badge key={g} variant="neutral">{g}</Badge>
            ))}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">{media.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px] text-muted">
            {media.release_year && (
              <span className="flex items-center gap-1.5"><Calendar className="size-4" /> {media.release_year}</span>
            )}
            {media.number_of_seasons && (
              <span className="flex items-center gap-1.5"><Layers className="size-4" /> {media.number_of_seasons} seasons</span>
            )}
            <span className="flex items-center gap-1.5"><Star className="size-4 fill-warn text-warn" /> {media.vote_average.toFixed(1)}</span>
            <span className="flex items-center gap-1.5"><Users className="size-4" /> {compact(1200 + media.tmdb_id % 5000)} members</span>
          </div>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-foreground/85">{media.overview}</p>
          <div className="mt-5">
            <TitleActions media={media} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ShowRating media={media} />
      </div>

      {media.media_type === "tv" && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Seasons</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {seasons.map((s) => (
              <Link
                key={s.id}
                href={`/title/${id}/season/${s.season_number}`}
                className="glass glass-hover rounded-2xl p-4"
              >
                <div
                  className="mb-3 h-24 rounded-xl ring-1 ring-white/10"
                  style={{ background: posterGradient(`${media.title} ${s.season_number}`) }}
                />
                <p className="font-semibold">{s.name}</p>
                <p className="text-[12px] text-muted-2">{s.episode_count} episodes</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
