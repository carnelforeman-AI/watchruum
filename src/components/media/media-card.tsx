import Link from "next/link";
import { Poster } from "@/components/media/poster";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/media/rating";
import type { MediaItem } from "@/lib/types";

export function MediaCard({ media }: { media: MediaItem }) {
  return (
    <Link href={`/title/${media.id}`} className="glass glass-hover group block overflow-hidden rounded-2xl">
      <div className="relative">
        <Poster title={media.title} src={media.poster_url} genres={media.genres} rounded="rounded-none" className="aspect-[2/3] w-full" />
        <div className="absolute inset-x-0 top-0 flex justify-between p-2">
          <Badge variant={media.media_type === "tv" ? "default" : "neutral"}>
            {media.media_type === "tv" ? "Show" : "Movie"}
          </Badge>
          <span className="rounded-full bg-black/50 px-1.5 py-0.5 backdrop-blur">
            <RatingBadge score={media.vote_average} />
          </span>
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-bold">{media.title}</p>
        <p className="truncate text-[12px] text-muted-2">
          {media.release_year ?? "—"} · {media.genres[0] ?? "Drama"}
        </p>
      </div>
    </Link>
  );
}

export function MediaGrid({ items }: { items: MediaItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((m) => (
        <MediaCard key={m.id} media={m} />
      ))}
    </div>
  );
}
