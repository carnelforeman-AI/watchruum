/** Shared (client-safe) types for the Watch Rooms page. */
import type { MediaItem } from "./types";

export interface WatchRoom {
  id: string;
  media: MediaItem;
  rank: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeTitle: string | null;
  scopeLabel: string; // e.g. `S2 E6 • "The Price"`
  seasonTag: string; // e.g. "Season 2" / "Series" / genre
  spoilerTag: string; // e.g. "Episode Spoilers"
  network: string | null; // e.g. "HBO"
  inRoom: number;
  messages: number;
  engagement: number;
  engagementScore: number; // 0-100
  live: boolean; // LIVE NOW vs HOT ROOM
  hot: boolean;
}

export interface WatchRoomsData {
  rooms: WatchRoom[];
  trendingNow: WatchRoom[];
  leaderboard: WatchRoom[];
  activeNow: number;
}
