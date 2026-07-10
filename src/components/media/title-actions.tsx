"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Check, PlayCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/media/rating";
import { useTrailer } from "@/components/calendar/trailer-modal";
import { toggleWatchlist, markMovieWatched, rate } from "@/app/actions";
import type { MediaItem } from "@/lib/types";

export function TitleActions({ media }: { media: MediaItem }) {
  const [inList, setInList] = useState(false);
  const [watched, setWatched] = useState(false);
  const [, start] = useTransition();
  const { play } = useTrailer();
  const isMovie = media.media_type === "movie";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="default"
        onClick={() => play(media.tmdb_id, media.media_type, media.title)}
      >
        <PlayCircle /> Trailer
      </Button>

      <Button
        variant={inList ? "accent" : "secondary"}
        onClick={() => {
          const next = !inList;
          setInList(next);
          start(() => {
            toggleWatchlist(media, next);
          });
        }}
      >
        {inList ? <BookmarkCheck /> : <Bookmark />}
        {inList ? "In Watchlist" : "Add to Watchlist"}
      </Button>

      {isMovie && (
        <Button
          variant={watched ? "secondary" : "accent"}
          onClick={() => {
            const next = !watched;
            setWatched(next);
            start(() => {
              markMovieWatched(media, next);
            });
          }}
        >
          <Check /> {watched ? "Watched" : "Mark watched"}
        </Button>
      )}
    </div>
  );
}

export function ShowRating({ media }: { media: MediaItem }) {
  const [score, setScore] = useState(0);
  const [, start] = useTransition();
  return (
    <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Star className="size-4 text-warn" />
        <span className="text-sm font-semibold">
          Your rating for the whole {media.media_type === "movie" ? "movie" : "show"}
        </span>
      </div>
      <StarRating
        value={score}
        onChange={(v) => {
          setScore(v);
          start(() => {
            rate(media, v, null, null);
          });
        }}
      />
    </div>
  );
}
