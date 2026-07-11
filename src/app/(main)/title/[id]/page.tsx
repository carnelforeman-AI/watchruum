import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  Layers,
  Star,
  MessageSquare,
  ChevronRight,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getMedia, getSeasons, getCredits } from "@/lib/tmdb";
import { Poster } from "@/components/media/poster";
import { Badge } from "@/components/ui/badge";
import { TitleActions, ShowRating } from "@/components/media/title-actions";
import { ReviewsSection } from "@/components/review/reviews-section";
import { getReviewsForMedia } from "@/lib/queries";
import { posterGradient, compact, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await getMedia(id);
  return { title: media ? `${media.title} · Watchruum` : "Title · Watchruum" };
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await getMedia(id);
  if (!media) notFound();

  const isTv = media.media_type === "tv";
  const [seasons, reviews, cast] = await Promise.all([
    isTv ? getSeasons(id) : Promise.resolve([]),
    getReviewsForMedia(media.tmdb_id, media.media_type),
    getCredits(id, 20),
  ]);

  const members = compact(1200 + (media.tmdb_id % 5000));
  const filledStars = Math.round(media.vote_average / 2);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      {/* Backdrop */}
      <div className="relative -mx-4 -mt-6 mb-6 h-56 overflow-hidden md:-mx-6 md:h-80">
        <div className="absolute inset-0" style={{ background: posterGradient(media.title) }} />
        {media.backdrop_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.backdrop_url} alt="" className="h-full w-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-bg/40" />
      </div>

      {/* Hero */}
      <div className="grid gap-6 lg:grid-cols-[176px_1fr_260px]">
        {/* Poster */}
        <div className="flex flex-col items-center gap-3 lg:items-start">
          <Poster
            title={media.title}
            src={media.poster_url}
            showTitle={!media.poster_url}
            className="h-64 w-44 shrink-0"
          />
        </div>

        {/* Main info */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isTv ? "default" : "neutral"}>{isTv ? "TV Show" : "Movie"}</Badge>
            <Badge variant="safe">
              <ShieldCheck className="mr-1 inline size-3" /> Spoiler-safe
            </Badge>
            {media.genres.slice(0, 4).map((g) => (
              <Badge key={g} variant="neutral">
                {g}
              </Badge>
            ))}
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">{media.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${i < filledStars ? "fill-warn text-warn" : "text-muted-2"}`}
                />
              ))}
            </span>
            <span className="text-sm font-bold">
              {media.vote_average.toFixed(1)}{" "}
              <span className="font-medium text-muted-2">/ 10 · TMDb</span>
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-muted">
            {media.release_year && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4" /> {media.release_year}
              </span>
            )}
            {media.number_of_seasons && (
              <span className="flex items-center gap-1.5">
                <Layers className="size-4" /> {media.number_of_seasons} seasons
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="size-4" /> {members} tracking
            </span>
          </div>

          {media.overview && (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-foreground/85">
              {media.overview}
            </p>
          )}

          <div className="mt-5">
            <TitleActions media={media} />
          </div>
        </div>

        {/* Side rail */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="panel rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold leading-none">{members}</p>
              <p className="mt-1 text-[12px] text-muted">
                tracking this {isTv ? "show" : "movie"}
              </p>
            </div>
            <div className="panel rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold leading-none">{compact(reviews.length)}</p>
              <p className="mt-1 text-[12px] text-muted">reviews</p>
            </div>
          </div>

          {/* Cosmetic, until where-to-watch links go live */}
          <div className="relative">
            <span className="absolute -top-2 right-3 z-10 rounded-full bg-warn px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-black">
              COMING SOON
            </span>
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-3 text-sm font-bold text-white opacity-70"
            >
              <Lock className="size-4" /> Watch Now
            </button>
          </div>

          {isTv && seasons.length > 0 && (
            <a
              href="#rooms"
              className="text-center text-[12.5px] font-bold uppercase tracking-wide text-warn hover:underline"
            >
              Already seen it? Set your progress ↓
            </a>
          )}
        </div>
      </div>

      {/* Whole-title rating */}
      <div className="mt-6">
        <ShowRating media={media} />
      </div>

      {/* Cast */}
      {cast.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Cast</h2>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {cast.map((c) => (
              <div key={c.id} className="w-[132px] shrink-0">
                <div className="relative h-40 w-[132px] overflow-hidden rounded-xl ring-1 ring-border">
                  {c.profile_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.profile_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="grid h-full w-full place-items-center text-2xl font-extrabold text-white/85"
                      style={{ background: posterGradient(c.name) }}
                    >
                      {initials(c.name)}
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-bold">{c.name}</p>
                {c.character && (
                  <p className="truncate text-[11px] uppercase tracking-wide text-muted">
                    {c.character}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Watch Rooms */}
      <section id="rooms" className="mt-8 scroll-mt-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Watch Rooms</h2>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-safe">
            <ShieldCheck className="size-4" /> Spoiler-safe by episode
          </span>
        </div>

        {media.media_type === "movie" && (
          <Link
            href={`/title/${id}/room`}
            className="glass glass-hover flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <MessageSquare className="size-5" />
              </span>
              <div>
                <p className="font-semibold">Enter the Watchruum</p>
                <p className="text-[13px] text-muted-2">
                  Spoiler-safe chat, ratings and reactions for {media.title}.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-[13px] font-semibold text-white">
              Join Room <ChevronRight className="size-4" />
            </span>
          </Link>
        )}

        {isTv && (
          <>
            <p className="mb-3 text-[13px] text-muted">
              Pick a season, then an episode. You only see posts up to where you are, everything
              ahead stays locked.
            </p>
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
          </>
        )}
      </section>

      <ReviewsSection media={media} initialReviews={reviews} />
    </div>
  );
}
