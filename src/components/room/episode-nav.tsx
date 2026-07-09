import Link from "next/link";
import { ChevronDown, Play, CheckCircle2, Lock } from "lucide-react";
import { SafeZonePill } from "@/components/room/spoiler-standard";
import { cn, posterGradient } from "@/lib/utils";

export interface EpisodeNavProps {
  media: { id: string; title: string; poster_url: string | null };
  season: number;
  currentEpisode: number;
  seasonName: string; // e.g. the current episode's name, like "Day One"
  episodes: { episode_number: number; name: string }[];
  watchedEpisodes: number[]; // episode numbers the viewer has watched
  furthestEpisode: number | null; // viewer's furthest watched episode in this season (null if none)
}

type EpisodeState = "current" | "watched" | "locked" | "available";

function episodeState(
  epNumber: number,
  currentEpisode: number,
  watchedEpisodes: number[],
  furthestEpisode: number | null,
): EpisodeState {
  if (epNumber === currentEpisode) return "current";
  if (watchedEpisodes.includes(epNumber) || (furthestEpisode !== null && epNumber <= furthestEpisode)) {
    return "watched";
  }
  const locked = furthestEpisode === null ? epNumber > 1 : epNumber > furthestEpisode;
  if (locked) return "locked";
  return "available";
}

export function EpisodeNav(props: EpisodeNavProps) {
  const { media, season, currentEpisode, seasonName, episodes, watchedEpisodes, furthestEpisode } = props;

  return (
    <div className="glass rounded-2xl p-4">
      {/* Current room */}
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-2">Current Room</p>
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
        <div className="size-12 shrink-0 overflow-hidden rounded-lg">
          {media.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.poster_url} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full" style={{ background: posterGradient(media.title) }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{media.title}</p>
          <p className="text-[12px] text-muted-2">
            S{season} E{currentEpisode} – {seasonName}
          </p>
          <div className="mt-1.5">
            <SafeZonePill />
          </div>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-2" />
      </div>

      {/* Episodes in this room */}
      <p className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
        Episodes in This Room
      </p>
      <div className="space-y-0.5">
        {episodes.map((ep) => {
          const state = episodeState(ep.episode_number, currentEpisode, watchedEpisodes, furthestEpisode);
          const isCurrent = state === "current";
          return (
            <Link
              key={ep.episode_number}
              href={`/title/${media.id}/season/${season}/episode/${ep.episode_number}`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                isCurrent
                  ? "bg-gradient-to-r from-primary/25 to-accent/15 text-foreground ring-1 ring-primary/30"
                  : cn(
                      "hover:bg-white/5",
                      state === "watched" && "text-foreground/90",
                      (state === "locked" || state === "available") && "text-muted",
                    ),
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  S{season} E{ep.episode_number} – {ep.name}
                </p>
                {isCurrent && <p className="text-[11px] text-primary">You&apos;re here</p>}
              </div>
              {isCurrent && <Play className="size-4 shrink-0 text-primary" />}
              {state === "watched" && <CheckCircle2 className="size-4 shrink-0 text-safe" />}
              {state === "locked" && <Lock className="size-4 shrink-0 text-muted-2" />}
            </Link>
          );
        })}
      </div>

      {/* Show season rooms */}
      <Link
        href={`/title/${media.id}/season/${season}`}
        className="mt-4 block w-full rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-center text-[13px] font-semibold text-primary transition-colors hover:bg-white/[0.07]"
      >
        Show Season {season} Rooms
      </Link>
    </div>
  );
}
