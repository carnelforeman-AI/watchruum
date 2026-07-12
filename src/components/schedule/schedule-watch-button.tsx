"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleWatchModal } from "@/components/schedule/schedule-watch-modal";

/**
 * Opens the "schedule a watch" modal for a title. Drop on title pages / rooms.
 */
export function ScheduleWatchButton({
  tmdbId,
  mediaType,
  title,
  posterUrl,
  seasonNumber = null,
  episodeNumber = null,
  titleHref,
  className,
  label = "Schedule watch",
}: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  titleHref?: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold hover:bg-white/[0.07]",
          className,
        )}
      >
        <CalendarClock className="size-4" /> {label}
      </button>
      {open && (
        <ScheduleWatchModal
          tmdbId={tmdbId}
          mediaType={mediaType}
          title={title}
          posterUrl={posterUrl}
          seasonNumber={seasonNumber}
          episodeNumber={episodeNumber}
          titleHref={titleHref}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
