import Link from "next/link";
import { Calendar } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { SpoilerLegend, SafeZonePill } from "@/components/room/spoiler-standard";
import { posterGradient } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";
import type { RoomMember } from "@/lib/queries";

export function RoomRail({
  media,
  season,
  episode,
  episodeName,
  safeLabel,
  members,
  memberCount,
  createdBy,
}: {
  media: MediaItem;
  season: number;
  episode: number;
  episodeName: string;
  safeLabel: string;
  members: RoomMember[];
  memberCount: number;
  createdBy: { username: string; display_name: string } | null;
}) {
  return (
    <div className="space-y-4">
      {/* Room Info */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 text-base font-semibold">Room Info</h3>
        <div className="flex gap-3">
          <span
            className="relative grid h-24 w-16 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-border"
            style={{ background: posterGradient(media.title) }}
          >
            {media.poster_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.poster_url} alt="" className="size-full object-cover" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-tight">{media.title}</p>
            <p className="text-[12px] text-muted-2">
              S{season} E{episode} – {episodeName}
            </p>
            <div className="mt-2">
              <SafeZonePill />
            </div>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          This is the Safe Zone for {safeLabel}. No spoilers beyond this episode. Use spoiler tags when needed.
        </p>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[12px] text-muted-2">
          <Calendar className="size-3.5" />
          {createdBy ? (
            <>
              Hosted by{" "}
              <Link href={`/u/${createdBy.username}`} className="font-semibold text-muted hover:text-foreground">
                @{createdBy.username}
              </Link>
            </>
          ) : (
            <>Room opens when the first fan posts.</>
          )}
        </div>
      </div>

      {/* Spoiler Protection standard */}
      <SpoilerLegend season={season} episode={episode} />

      {/* Room Members */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            Room Members
            <span className="text-[12px] font-medium text-muted-2">{memberCount}</span>
          </h3>
          {memberCount > 0 && <span className="text-[12px] font-semibold text-primary">See all</span>}
        </div>
        {members.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-muted-2">No members yet — be the first to post.</p>
        ) : (
          <ul className="space-y-1">
            {members.slice(0, 6).map((m) => (
              <li key={m.id}>
                <Link
                  href={`/u/${m.username}`}
                  className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-white/5"
                >
                  <Avatar name={m.display_name} src={m.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                      <span className="truncate">{m.display_name}</span>
                      {m.is_admin && (
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          Mod
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[12px] text-muted-2">@{m.username}</p>
                  </div>
                  <span className={`size-2 shrink-0 rounded-full ${m.online ? "bg-safe" : "bg-muted-2/40"}`} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
