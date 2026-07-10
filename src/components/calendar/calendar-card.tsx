"use client";

import Link from "next/link";
import { Users, PlayCircle } from "lucide-react";
import { Poster } from "@/components/media/poster";
import { cn } from "@/lib/utils";
import { NotifyButton, WatchlistButton, useAlerts, formatFans, type AlertEntry } from "./alerts-context";
import { useTrailer } from "./trailer-modal";
import type { CalendarItem, CalKind } from "@/lib/calendar-constants";
import type { MediaItem } from "@/lib/types";

const KIND_LABEL: Record<CalKind, string> = {
  movie: "Movie",
  series: "TV Show",
  new_season: "New Season",
  new_episode: "New Episode",
};

export function toMedia(i: CalendarItem): MediaItem {
  return {
    id: i.id,
    tmdb_id: i.tmdbId,
    media_type: i.mediaType,
    title: i.title,
    overview: i.overview,
    poster_url: i.poster,
    backdrop_url: i.backdrop,
    release_year: i.releaseDate ? Number(i.releaseDate.slice(0, 4)) : null,
    genres: i.genres,
    vote_average: i.voteAverage,
  };
}

export function entryOf(i: CalendarItem): AlertEntry {
  return { tmdbId: i.tmdbId, mediaType: i.mediaType, title: i.title, poster: i.poster, releaseDate: i.releaseDate };
}

function TrailerButton({ item }: { item: CalendarItem }) {
  const { play } = useTrailer();
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        play(item.tmdbId, item.mediaType, item.title);
      }}
      aria-label="Watch trailer"
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-2 text-[12px] font-semibold text-muted transition-colors hover:text-foreground"
    >
      <PlayCircle className="size-3.5" /> Trailer
    </button>
  );
}

export function CalendarCard({ item, rank }: { item: CalendarItem; rank?: number }) {
  const { fans } = useAlerts();
  const total = fans(item.mediaType, item.tmdbId, item.fans);

  return (
    <div className="glass-hover group flex flex-col overflow-hidden rounded-2xl border border-border-soft">
      <Link href={`/title/${item.id}`} className="relative block">
        <Poster
          title={item.title}
          src={item.poster}
          genres={item.genres}
          showTitle={false}
          rounded="rounded-none"
          className="aspect-[2/3] w-full"
        />
        {rank != null && (
          <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-primary text-[13px] font-bold text-white ring-2 ring-black/40">
            {rank}
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {KIND_LABEL[item.kind]}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="truncate text-[14px] font-bold leading-tight">{item.title}</p>
        <p className="truncate text-[11px] text-muted-2">{item.genres.slice(0, 2).join(" / ") || "—"}</p>
        <p className="text-[12px] font-medium text-primary">{item.releaseLabel}</p>
        {item.network && <p className="truncate text-[11px] font-semibold text-muted">{item.network}</p>}
        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-2">
          <Users className="size-3" /> {formatFans(total)} waiting
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <NotifyButton entry={entryOf(item)} className="flex-1" />
          <WatchlistButton media={toMedia(item)} />
          <TrailerButton item={item} />
        </div>
      </div>
    </div>
  );
}

/** Compact horizontal card for the "Coming to Theaters" / list rails. */
export function CalendarRow({ item }: { item: CalendarItem }) {
  return (
    <Link
      href={`/title/${item.id}`}
      className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5"
    >
      <Poster
        title={item.title}
        src={item.poster}
        genres={item.genres}
        showTitle={false}
        rounded="rounded-md"
        className="h-14 w-10 shrink-0 ring-1 ring-white/10"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{item.title}</p>
        <p className="text-[11px] text-muted-2">{item.releaseLabel}</p>
      </div>
    </Link>
  );
}

export function GenreTile({ name, count }: { name: string; count: number }) {
  return (
    <Link
      href={`/calendar?genre=${encodeURIComponent(name)}`}
      className={cn(
        "glass-hover flex h-24 flex-col justify-end rounded-2xl border border-border-soft p-3 ring-1 ring-white/5",
      )}
    >
      <p className="text-[15px] font-extrabold">{name}</p>
      <p className="text-[11px] text-muted-2">{count}+ titles</p>
    </Link>
  );
}
