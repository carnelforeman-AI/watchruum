"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";
import type { ViewerProgress } from "@/lib/spoiler";
import type { RoomThread, RoomPoll, RoomMediaItem } from "@/lib/room-tabs";
import { DiscussionPanel } from "@/components/room/discussion-panel";
import { PollsPanel } from "@/components/room/polls-panel";
import { MediaPanel } from "@/components/room/media-panel";
import { AboutPanel } from "@/components/room/about-panel";

type Tab = "Chat" | "Discussion" | "Polls" | "Media" | "About";
const TABS: Tab[] = ["Chat", "Discussion", "Polls", "Media", "About"];

export interface RoomCtx {
  media: MediaItem;
  season: number | null;
  episode: number | null;
  isMovie: boolean;
  safeLabel: string;
  viewerId: string | null;
  viewerName: string | null;
  progress: ViewerProgress | null;
}

export interface AboutData {
  titleId: string;
  title: string;
  isMovie: boolean;
  releaseYear: number | null;
  safeLabel: string;
  spoilerLine: string;
  memberCount: number;
  onlineCount: number;
  createdBy: { username: string; display_name: string } | null;
}

/**
 * Interactive room tabs. The tab bar switches the center column between the
 * live Chat (passed as a slot so its props stay server-built) and the
 * Discussion / Polls / Media / About panels. Left/right rails are optional
 * slots so this works for both the 3-pane episode room and 2-pane movie room.
 */
export function RoomTabs({
  ctx,
  about,
  threads,
  polls,
  mediaItems,
  chat,
  leftRail,
  rightRail,
}: {
  ctx: RoomCtx;
  about: AboutData;
  threads: RoomThread[];
  polls: RoomPoll[];
  mediaItems: RoomMediaItem[];
  chat: React.ReactNode;
  leftRail?: React.ReactNode;
  rightRail?: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("Chat");

  const counts: Partial<Record<Tab, number>> = {
    Discussion: threads.length,
    Polls: polls.length,
    Media: mediaItems.length,
  };

  const gridCols = leftRail
    ? "lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_320px]"
    : "xl:grid-cols-[minmax(0,1fr)_320px]";

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = tab === t;
          const c = counts[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[14px] font-semibold transition-colors",
                active ? "border-primary text-foreground" : "border-transparent text-muted-2 hover:text-foreground",
              )}
            >
              {t}
              {c ? (
                <span className={cn("grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold", active ? "bg-primary/20 text-primary" : "bg-white/10 text-muted")}>
                  {c}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Layout */}
      <div className={cn("grid gap-5", gridCols)}>
        {leftRail && <aside className="hidden lg:block">{leftRail}</aside>}

        <main className="min-w-0">
          {/* Chat stays mounted (hidden when inactive) so its state survives tab switches. */}
          <div className={tab === "Chat" ? "" : "hidden"}>{chat}</div>
          {tab === "Discussion" && <DiscussionPanel ctx={ctx} initialThreads={threads} />}
          {tab === "Polls" && <PollsPanel ctx={ctx} initialPolls={polls} />}
          {tab === "Media" && <MediaPanel ctx={ctx} initialMedia={mediaItems} />}
          {tab === "About" && <AboutPanel {...about} />}
        </main>

        {rightRail && <aside className="hidden xl:block">{rightRail}</aside>}
      </div>
    </div>
  );
}
