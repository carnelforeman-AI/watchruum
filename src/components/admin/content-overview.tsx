"use client";

import { useState } from "react";
import { Poster } from "@/components/media/poster";
import { cn, compact } from "@/lib/utils";
import type { MediaItem, Room } from "@/lib/types";

type Tab = "shows" | "movies" | "rooms";

export function ContentOverview({
  shows,
  movies,
  rooms,
}: {
  shows: MediaItem[];
  movies: MediaItem[];
  rooms: Room[];
}) {
  const [tab, setTab] = useState<Tab>("shows");

  const media = tab === "shows" ? shows : tab === "movies" ? movies : rooms.map((r) => r.media);
  const subtitleFor = (i: number): string =>
    tab === "rooms" ? `${compact(rooms[i]?.active_users ?? 0)} members` : media[i]?.genres?.[0] ?? "—";

  const tabs: { key: Tab; label: string }[] = [
    { key: "shows", label: "Trending Shows" },
    { key: "movies", label: "Trending Movies" },
    { key: "rooms", label: "Most Active Rooms" },
  ];

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Content Overview</h3>
        <div className="flex gap-1 rounded-xl border border-border bg-white/[0.03] p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
                tab === t.key ? "bg-primary/20 text-foreground ring-1 ring-primary/30" : "text-muted hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {media.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-2">No content to show yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {media.slice(0, 5).map((m, i) => (
            <div key={`${m.id}-${i}`} className="min-w-0">
              <div className="relative">
                <Poster
                  title={m.title}
                  src={m.poster_url}
                  genres={m.genres}
                  showTitle={false}
                  className="aspect-[2/3] w-full ring-1 ring-white/10"
                />
                <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-lg bg-primary text-[12px] font-bold text-white shadow">
                  {i + 1}
                </span>
              </div>
              <p className="mt-2 truncate text-[13px] font-semibold">{m.title}</p>
              <p className="truncate text-[11px] text-muted-2">{subtitleFor(i)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
