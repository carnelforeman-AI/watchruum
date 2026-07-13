/** Shared Lobby types, safe to import from client and server. */

export interface LobbyAuthor {
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_tester?: boolean;
}

export interface LobbyPost {
  id: string;
  author: LobbyAuthor;
  body: string | null;
  spoiler: boolean;
  media: { id: string; title: string; type: string } | null;
  image_url: string | null;
  created_at: string;
  replyTo: string | null;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
  /** Seeded placeholder shown pre-launch; interactions are visual only. */
  demo?: boolean;
}

export interface LobbyTrend {
  label: string;
  category: string;
  posts: number;
  poster: string | null;
}

export interface LobbySuggestion {
  id?: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface TitleHit {
  id: string;
  title: string;
  type: string;
  poster: string | null;
  year: number | null;
}

export interface GifResult {
  id: string;
  previewUrl: string;
  url: string;
  width: number;
  height: number;
  title: string;
}

export interface LobbyData {
  live: boolean;
  signedIn: boolean;
  me: LobbyAuthor | null;
  posts: LobbyPost[];
  followingIds: string[];
  trends: LobbyTrend[];
  suggestions: LobbySuggestion[];
}
