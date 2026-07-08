import type {
  ActivityEvent,
  Comment,
  Episode,
  MediaItem,
  Profile,
  Review,
  Room,
  Season,
} from "./types";

/**
 * Fictional placeholder catalog — no copyrighted titles or artwork.
 * Posters are rendered as deterministic gradients (see posterGradient()).
 * When TMDb keys are configured this data is replaced by live metadata.
 */

export const PROFILES: Record<string, Profile> = {
  alex: {
    id: "u_alex",
    username: "alexm",
    display_name: "Alex Morgan",
    avatar_url: null,
    bio: "Chasing finales. Hiding from spoilers.",
    favorite_genres: ["Drama", "Sci-Fi", "Thriller"],
  },
  sarah: { id: "u_sarah", username: "sarahk", display_name: "Sarah Kim", avatar_url: null, bio: "", favorite_genres: ["Drama"] },
  mike: { id: "u_mike", username: "mikeb", display_name: "Mike Boone", avatar_url: null, bio: "", favorite_genres: ["Sci-Fi"] },
  jess: { id: "u_jess", username: "jessr", display_name: "Jess Rivera", avatar_url: null, bio: "", favorite_genres: ["Fantasy"] },
  tom: { id: "u_tom", username: "tomh", display_name: "Tom Hale", avatar_url: null, bio: "", favorite_genres: ["Crime"] },
  maya: { id: "u_maya", username: "mayad", display_name: "Maya Diaz", avatar_url: null, bio: "", favorite_genres: ["Drama"] },
  drew: { id: "u_drew", username: "drewp", display_name: "Drew Park", avatar_url: null, bio: "", favorite_genres: ["Sci-Fi"] },
};

export const MEDIA: MediaItem[] = [
  {
    id: "m_frontier", tmdb_id: 900001, media_type: "tv", title: "Frontier Blood",
    overview: "A ranching dynasty fights to hold its land as the modern world closes in around them.",
    poster_url: null, backdrop_url: null, release_year: 2023, genres: ["Drama", "Western"],
    vote_average: 8.7, number_of_seasons: 2,
  },
  {
    id: "m_ascension", tmdb_id: 900002, media_type: "tv", title: "Campus Ascension",
    overview: "At an elite university, a group of students discover they share impossible abilities.",
    poster_url: null, backdrop_url: null, release_year: 2024, genres: ["Drama", "Sci-Fi"],
    vote_average: 8.2, number_of_seasons: 2,
  },
  {
    id: "m_signal", tmdb_id: 900003, media_type: "tv", title: "The Last Signal",
    overview: "Survivors of a global blackout follow a mysterious broadcast across the ruins of a continent.",
    poster_url: null, backdrop_url: null, release_year: 2024, genres: ["Sci-Fi", "Thriller"],
    vote_average: 9.0, number_of_seasons: 1,
  },
  {
    id: "m_crown", tmdb_id: 900004, media_type: "tv", title: "Crown City",
    overview: "Rival dynasties scheme for the throne of a fractured kingdom.",
    poster_url: null, backdrop_url: null, release_year: 2022, genres: ["Fantasy", "Drama"],
    vote_average: 8.5, number_of_seasons: 2,
  },
  {
    id: "m_table", tmdb_id: 900005, media_type: "tv", title: "The Final Table",
    overview: "Twelve strangers compete in a high-stakes game where the rules keep changing.",
    poster_url: null, backdrop_url: null, release_year: 2025, genres: ["Reality", "Competition"],
    vote_average: 7.9, number_of_seasons: 1,
  },
  {
    id: "m_echo", tmdb_id: 900006, media_type: "tv", title: "Echo Station",
    overview: "The crew of a deep-space relay uncovers a signal that should not exist.",
    poster_url: null, backdrop_url: null, release_year: 2024, genres: ["Sci-Fi", "Mystery"],
    vote_average: 8.8, number_of_seasons: 1,
  },
  {
    id: "m_iron", tmdb_id: 900007, media_type: "tv", title: "Iron District",
    overview: "A homicide detective hunts a killer through a decaying industrial city.",
    poster_url: null, backdrop_url: null, release_year: 2023, genres: ["Crime", "Thriller"],
    vote_average: 8.4, number_of_seasons: 3,
  },
  {
    id: "m_midnight", tmdb_id: 900008, media_type: "movie", title: "Midnight Case",
    overview: "A defense attorney takes the one case that could destroy her.",
    poster_url: null, backdrop_url: null, release_year: 2025, genres: ["Thriller", "Drama"],
    vote_average: 8.1,
  },
];

export const MEDIA_BY_ID = Object.fromEntries(MEDIA.map((m) => [m.id, m]));

/** Seasons for the TV titles. */
export const SEASONS: Season[] = [
  { id: "s_frontier_1", media_id: "m_frontier", season_number: 1, name: "Season 1", episode_count: 8 },
  { id: "s_frontier_2", media_id: "m_frontier", season_number: 2, name: "Season 2", episode_count: 8 },
  { id: "s_ascension_1", media_id: "m_ascension", season_number: 1, name: "Season 1", episode_count: 10 },
  { id: "s_ascension_2", media_id: "m_ascension", season_number: 2, name: "Season 2", episode_count: 10 },
  { id: "s_signal_1", media_id: "m_signal", season_number: 1, name: "Season 1", episode_count: 9 },
  { id: "s_echo_1", media_id: "m_echo", season_number: 1, name: "Season 1", episode_count: 9 },
];

const EP_TITLES = [
  "Cold Open", "The Arrangement", "Fault Lines", "Day One", "The Trap",
  "Homecoming", "The Oath", "Everything Burns", "The We We Are", "Last Light",
];

/** Generate episodes for a season deterministically. */
export function episodesFor(mediaId: string, season: number, count: number): Episode[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `e_${mediaId}_${season}_${n}`,
      media_id: mediaId,
      season_number: season,
      episode_number: n,
      name: EP_TITLES[(season + i) % EP_TITLES.length],
      overview:
        "The stakes rise as long-buried tensions finally come to the surface and no one is left unchanged.",
      air_date: `2024-0${((season + i) % 9) + 1}-0${(i % 9) + 1}`,
      still_url: null,
      runtime: 48 + (i % 4) * 6,
    };
  });
}

export const ROOMS: Room[] = [
  { id: "r1", media: MEDIA_BY_ID["m_frontier"], scope_label: "S2 E4 - Day One", season_number: 2, episode_number: 4, active_users: 1200, is_hot: true },
  { id: "r2", media: MEDIA_BY_ID["m_crown"], scope_label: "S2 E1 - A Son for a Son", season_number: 2, episode_number: 1, active_users: 842 },
  { id: "r3", media: MEDIA_BY_ID["m_iron"], scope_label: "S1 E5 - The Trap", season_number: 1, episode_number: 5, active_users: 611 },
  { id: "r4", media: MEDIA_BY_ID["m_signal"], scope_label: "S4 E6 - Dirty Work", season_number: 1, episode_number: 6, active_users: 503 },
  { id: "r5", media: MEDIA_BY_ID["m_echo"], scope_label: "S1 E8 - The Oath", season_number: 1, episode_number: 8, active_users: 428 },
  { id: "r6", media: MEDIA_BY_ID["m_ascension"], scope_label: "S1 E9 - The We We Are", season_number: 1, episode_number: 9, active_users: 357 },
];

export interface ProgressCard {
  media: MediaItem;
  season_number: number;
  episode_number: number;
  label: string;
  percent: number;
}

export const CONTINUE_WATCHING: ProgressCard[] = [
  { media: MEDIA_BY_ID["m_frontier"], season_number: 2, episode_number: 4, label: "S2 E4 · Day One", percent: 65 },
  { media: MEDIA_BY_ID["m_crown"], season_number: 2, episode_number: 1, label: "S2 E1 · A Son for a Son", percent: 33 },
  { media: MEDIA_BY_ID["m_iron"], season_number: 1, episode_number: 5, label: "S1 E5 · The Trap", percent: 80 },
];

export const YOUR_PROGRESS: ProgressCard[] = [
  { media: MEDIA_BY_ID["m_frontier"], season_number: 2, episode_number: 4, label: "Season 2", percent: 44 },
  { media: MEDIA_BY_ID["m_crown"], season_number: 2, episode_number: 1, label: "Season 2", percent: 12 },
  { media: MEDIA_BY_ID["m_signal"], season_number: 1, episode_number: 6, label: "Season 1", percent: 62 },
];

export const WATCHLIST: { media: MediaItem; label: string }[] = [
  { media: MEDIA_BY_ID["m_signal"], label: "S4 E1" },
  { media: MEDIA_BY_ID["m_iron"], label: "S1 E1" },
  { media: MEDIA_BY_ID["m_ascension"], label: "S1 E1" },
];

export interface DiscussionCard {
  id: string;
  media: MediaItem;
  scope: string;
  title: string;
  comment_count: number;
  participants: string[];
  created_at: string;
}

export const TOP_DISCUSSIONS: DiscussionCard[] = [
  { id: "d1", media: MEDIA_BY_ID["m_frontier"], scope: "S2 E4", title: "That ending broke me.", comment_count: 1200, participants: ["Sarah Kim", "Mike Boone", "Jess Rivera", "Tom Hale", "Maya Diaz", "Drew Park"], created_at: iso(2) },
  { id: "d2", media: MEDIA_BY_ID["m_iron"], scope: "S1 E5", title: "The Trap was WILD", comment_count: 611, participants: ["Drew Park", "Tom Hale", "Sarah Kim"], created_at: iso(3) },
  { id: "d3", media: MEDIA_BY_ID["m_crown"], scope: "S2 E1", title: "A perfect season opener!", comment_count: 842, participants: ["Jess Rivera", "Maya Diaz", "Mike Boone", "Sarah Kim", "Tom Hale"], created_at: iso(5) },
  { id: "d4", media: MEDIA_BY_ID["m_signal"], scope: "S1 E6", title: "The signal changed everything", comment_count: 503, participants: ["Mike Boone", "Drew Park"], created_at: iso(1) },
];

export const POPULAR_REVIEWS: Review[] = [
  {
    id: "rev1", author: PROFILES.maya, media: { id: "m_frontier", title: "Frontier Blood" },
    season_number: 2, episode_number: 4, score: 9.5, spoiler_scope: "none",
    body: "This episode was everything. The emotional weight, the performances, the silence. Masterpiece.",
    like_count: 120, comment_count: 34, created_at: iso(6),
  },
  {
    id: "rev2", author: PROFILES.drew, media: { id: "m_signal", title: "The Last Signal" },
    season_number: 1, episode_number: 5, score: 8.7, spoiler_scope: "none",
    body: "The world building in this episode was insane. Can't wait to see where this goes.",
    like_count: 98, comment_count: 21, created_at: iso(8),
  },
];

export const FRIEND_ACTIVITY: ActivityEvent[] = [
  { id: "a1", actor: PROFILES.sarah, verb: "joined the room", target: "The Last Signal S4 E6", created_at: iso(0.03) },
  { id: "a2", actor: PROFILES.mike, verb: "rated", target: "The Last Signal S1 E5", score: 8, created_at: iso(0.25) },
  { id: "a3", actor: PROFILES.jess, verb: "reviewed", target: "Crown City S2 E1", created_at: iso(1) },
  { id: "a4", actor: PROFILES.tom, verb: "joined the room", target: "Echo Station S1 E8", created_at: iso(2) },
];

/** Comments for an episode room (used by the episode page demo). */
export function commentsFor(mediaId: string, season: number, episode: number): Comment[] {
  return [
    {
      id: `c_${mediaId}_${season}_${episode}_1`, author: PROFILES.sarah,
      body: "The tension in the final act was unreal. Did anyone else gasp at that reveal?",
      spoiler_scope: "episode", season_number: season, episode_number: episode,
      like_count: 42, created_at: iso(1),
    },
    {
      id: `c_${mediaId}_${season}_${episode}_2`, author: PROFILES.mike,
      body: "Callback to the pilot was *chef's kiss*. This show plants everything early.",
      spoiler_scope: "episode", season_number: season, episode_number: episode,
      like_count: 18, created_at: iso(2),
    },
    {
      id: `c_${mediaId}_${season}_${episode}_3`, author: PROFILES.jess,
      body: "Okay but this completely changes what happens in the finale...",
      spoiler_scope: "series", season_number: null, episode_number: null,
      like_count: 7, created_at: iso(3),
    },
  ];
}

function iso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
}

export const CURRENT_USER = PROFILES.alex;
