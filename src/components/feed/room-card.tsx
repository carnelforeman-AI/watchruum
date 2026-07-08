import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Poster } from "@/components/media/poster";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/media/rating";
import { compact } from "@/lib/utils";
import type { Room } from "@/lib/types";

export function RoomCard({ room }: { room: Room }) {
  const href =
    room.season_number && room.episode_number
      ? `/title/${room.media.id}/season/${room.season_number}/episode/${room.episode_number}`
      : `/title/${room.media.id}`;
  return (
    <Link href={href} className="glass glass-hover group block overflow-hidden rounded-2xl">
      <div className="relative">
        <Poster
          title={room.media.title}
          src={room.media.poster_url}
          genres={room.media.genres}
          rounded="rounded-none"
          className="aspect-[2/3] w-full"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {room.is_hot ? <Badge variant="hot">HOT</Badge> : <span />}
          <span className="rounded-full bg-black/50 px-1.5 py-0.5 backdrop-blur">
            <RatingBadge score={room.media.vote_average} />
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-bold">{room.media.title}</p>
        <p className="truncate text-[12px] text-muted-2">{room.scope_label}</p>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
          <MessageCircle className="size-3.5" />
          {compact(room.active_users)}
        </div>
      </div>
    </Link>
  );
}
