/** Core domain types for Watchruum. Mirrors the Supabase schema. */

export type MediaType = "movie" | "tv";

/** How far a piece of content spoils. */
export type SpoilerScope = "none" | "episode" | "season" | "series";

/** Runtime spoiler state for a post/review/comment relative to the viewer. */
export type SpoilerState = "safe" | "episode" | "season" | "series" | "locked";

export interface MediaItem {
  id: string; // internal id (or tmdb-prefixed for mock)
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  overview: string;
  poster_url: string | null;
  backdrop_url: string | null;
  release_year: number | null;
  genres: string[];
  vote_average: number; // TMDb 0-10
  vote_count?: number; // TMDb number of ratings (for AggregateRating structured data)
  number_of_seasons?: number;
  runtime?: number | null; // minutes (movie total, or a TV episode)
  certification?: string | null; // e.g. "PG", "TV-14"
}

export interface Season {
  id: string;
  media_id: string;
  season_number: number;
  name: string;
  episode_count: number;
  overview?: string;
}

export interface Episode {
  id: string;
  media_id: string;
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  still_url: string | null;
  runtime?: number | null;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_genres: string[];
}

/** A user's watch progress on a title. */
export interface WatchStatus {
  media_id: string;
  season_number: number | null;
  episode_number: number | null;
  movie_watched: boolean;
  in_watchlist: boolean;
}

export interface Rating {
  media_id: string;
  season_number: number | null;
  episode_number: number | null;
  score: number; // 1-10
}

export interface Comment {
  id: string;
  author: Profile;
  body: string;
  spoiler_scope: SpoilerScope;
  season_number: number | null;
  episode_number: number | null;
  like_count: number;
  liked_by_me?: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  author: Profile;
  media: Pick<MediaItem, "id" | "title">;
  season_number: number | null;
  episode_number: number | null;
  score: number;
  body: string;
  spoiler_scope: SpoilerScope;
  like_count: number;
  comment_count: number;
  created_at: string;
}

/** A discussion room = a scope on a media item. */
export interface Room {
  id: string;
  media: MediaItem;
  scope_label: string; // e.g. "S2 E4 - Day One"
  season_number: number | null;
  episode_number: number | null;
  active_users: number;
  is_hot?: boolean;
}

export interface ActivityEvent {
  id: string;
  actor: Profile;
  verb: "joined the room" | "rated" | "reviewed" | "commented on" | "followed you";
  target: string; // human readable
  score?: number;
  created_at: string;
}
