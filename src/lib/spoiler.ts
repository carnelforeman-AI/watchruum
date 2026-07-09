import type { SpoilerScope, SpoilerState, WatchStatus } from "./types";

/**
 * The spoiler engine.
 *
 * Core promise: a viewer only sees content whose spoiler reach is within
 * what they have already watched.
 *
 * A piece of content is tagged with:
 *   - spoiler_scope: how far it spoils ("none" | "episode" | "season" | "series")
 *   - season_number / episode_number: the point it spoils up to
 *
 * The viewer has watch progress on the same title. We compare the two.
 */

export interface ContentSpoilerTag {
  spoiler_scope: SpoilerScope;
  season_number: number | null;
  episode_number: number | null;
}

export interface ViewerProgress {
  /** highest season the viewer has watched into */
  season_number: number | null;
  /** highest episode within that season the viewer has watched */
  episode_number: number | null;
  /** for movies */
  movie_watched: boolean;
}

/** Encode (season, episode) into a single comparable number. */
function point(season: number | null, episode: number | null): number {
  return (season ?? 0) * 1000 + (episode ?? 0);
}

/**
 * Determine the spoiler state of a piece of content for a given viewer.
 * Returns "safe" when the viewer may freely see it, otherwise the level of
 * spoiler that is being withheld ("episode" | "season" | "series" | "locked").
 */
export function evaluateSpoiler(
  content: ContentSpoilerTag,
  progress: ViewerProgress | null,
  isMovie: boolean,
): SpoilerState {
  // Content that spoils nothing is always safe.
  if (content.spoiler_scope === "none") return "safe";

  // Not signed in / no progress recorded → everything spoiler-y is locked.
  if (!progress) return "locked";

  if (isMovie) {
    return progress.movie_watched ? "safe" : "locked";
  }

  const viewerPoint = point(progress.season_number, progress.episode_number);
  const contentPoint = point(content.season_number, content.episode_number);

  switch (content.spoiler_scope) {
    case "episode":
      // Safe once the viewer has watched that exact episode (or later).
      return viewerPoint >= contentPoint ? "safe" : "episode";
    case "season": {
      // Season spoilers are safe only if the viewer finished that season.
      // We treat "watched into a later season" as finished.
      const finishedSeason =
        (progress.season_number ?? 0) > (content.season_number ?? 0);
      return finishedSeason ? "safe" : "season";
    }
    case "series":
      // Series-ending spoilers: never auto-safe unless already deep past.
      return "series";
    default:
      return "safe";
  }
}

/** Whether a state means the content should be blurred/hidden by default. */
export function isHidden(state: SpoilerState): boolean {
  return state !== "safe";
}

const COPY: Record<SpoilerState, string> = {
  safe: "No spoilers",
  episode: "Spoilers for this episode",
  season: "Spoilers for this season",
  series: "Anything can be discussed",
  locked: "Not watched yet",
};

const COLOR: Record<SpoilerState, string> = {
  safe: "var(--color-safe)",
  episode: "var(--color-warn)",
  season: "var(--color-season)",
  series: "var(--color-danger)",
  locked: "var(--color-locked)",
};

const LABEL: Record<SpoilerState, string> = {
  safe: "Safe",
  episode: "Episode Spoilers",
  season: "Season Spoilers",
  series: "Full Series Spoilers",
  locked: "Locked",
};

export function spoilerMeta(state: SpoilerState) {
  return { copy: COPY[state], color: COLOR[state], label: LABEL[state] };
}

/**
 * The canonical spoiler scale, in order of increasing reach. This is the single
 * source of truth for the Spoiler Protection legend (and any badge) shown
 * anywhere on the site — same colors, labels and order everywhere.
 */
export const SPOILER_LEVELS: {
  state: SpoilerState;
  label: string;
  color: string;
  /** icon key so client components can map to a lucide icon */
  icon: "shield" | "episode" | "season" | "series" | "lock";
}[] = [
  { state: "safe", label: "Safe Zone", color: COLOR.safe, icon: "shield" },
  { state: "episode", label: "Episode Spoilers", color: COLOR.episode, icon: "episode" },
  { state: "season", label: "Season Spoilers", color: COLOR.season, icon: "season" },
  { state: "series", label: "Full Series Spoilers", color: COLOR.series, icon: "series" },
  { state: "locked", label: "Locked", color: COLOR.locked, icon: "lock" },
];

/** Sub-label for a spoiler level relative to a room's (season, episode). */
export function spoilerLevelDetail(
  state: SpoilerState,
  season: number | null,
  episode: number | null,
): string {
  const here = season && episode ? `S${season} E${episode}` : season ? `Season ${season}` : "here";
  switch (state) {
    case "safe":
      return `Up to ${here}`;
    case "episode":
      return `Beyond ${here}`;
    case "season":
      return season ? `Beyond Season ${season}` : "Beyond this season";
    case "series":
      return "Beyond the entire series";
    case "locked":
      return "Not watched yet";
  }
}

/**
 * The spoiler tag to stamp on a post, given the scope the author picked and the
 * room it was posted in. Returns a short chip label + the matching state.
 */
export function postTag(
  scope: SpoilerScope,
  season: number | null,
  episode: number | null,
): { state: SpoilerState; label: string } {
  switch (scope) {
    case "none":
      return { state: "safe", label: "Safe" };
    case "episode":
      return { state: "episode", label: season && episode ? `S${season} E${episode}` : "Episode" };
    case "season":
      return { state: "season", label: season ? `S${season}+` : "Season+" };
    case "series":
      return { state: "series", label: "Series+" };
  }
}

/** Human sentence explaining why content is hidden. */
export function hiddenReason(
  content: ContentSpoilerTag,
  progress: ViewerProgress | null,
): string {
  const s = content.season_number;
  const e = content.episode_number;
  const where = s && e ? `Season ${s}, Episode ${e}` : s ? `Season ${s}` : "a later point";
  if (!progress) return `This post discusses ${where}. Sign in and mark your progress to unlock it.`;
  const safe =
    progress.season_number && progress.episode_number
      ? `Season ${progress.season_number}, Episode ${progress.episode_number}`
      : "the start";
  return `This post discusses ${where}. You are currently safe through ${safe}.`;
}

/** Format a scope tag like "S2 E4". */
export function scopeLabel(season: number | null, episode: number | null): string {
  if (season && episode) return `S${season} E${episode}`;
  if (season) return `Season ${season}`;
  return "Overall";
}

export function progressFromWatch(w: WatchStatus | null): ViewerProgress | null {
  if (!w) return null;
  return {
    season_number: w.season_number,
    episode_number: w.episode_number,
    movie_watched: w.movie_watched,
  };
}
