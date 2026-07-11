import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { getShowEpisodeCount, trending } from "./tmdb";
import { getLiveMode } from "./settings";
import { getRoomActivity } from "./live-counts";
import { routeId, timeAgo } from "./utils";

/* Supabase row shapes are dynamic; mapped to typed objects at each boundary. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MediaItem, Room, Review, ActivityEvent, SpoilerScope } from "./types";
import { type DiscussionCard, PROFILES } from "./mock-data";

/**
 * Real "Trending Watch Rooms" built from live TMDb trending titles.
 * Posters, titles and ratings are real; the active-user counts are a
 * deterministic display value (there is no rooms table yet). Falls back
 * gracefully if TMDb is unavailable.
 */
export const getTrendingRooms = cache(async (limit = 6): Promise<Room[]> => {
  let items: MediaItem[] = [];
  try {
    items = await trending();
  } catch {
    items = [];
  }
  const slice = items.slice(0, limit);

  // Live Mode → real distinct posters per room (each new participant = +1).
  const live = await getLiveMode();
  const activity = live ? await getRoomActivity(slice) : null;

  return slice.map((m, i) => ({
    id: m.id,
    media: m,
    scope_label:
      [m.release_year, m.genres[0]].filter(Boolean).join(" · ") ||
      (m.media_type === "tv" ? "Series" : "Movie"),
    season_number: null,
    episode_number: null,
    active_users: activity
      ? activity.get(`${m.media_type}_${m.tmdb_id}`)?.members ?? 0
      : Math.max(120, 1900 - i * 240 + (m.tmdb_id % 80)),
    is_hot: activity ? false : i === 0,
  }));
});

/**
 * Sample dashboard content for the whole app, built from real TMDb titles so
 * no fictional placeholder titles appear anywhere. Demo social copy (names,
 * reactions) is kept, but every show/movie referenced is a real title.
 */
const DEMO_LINES = ["That ending broke me.", "A perfect opener!", "Nobody saw that coming.", "The tension was unreal."];
const DEMO_PARTICIPANTS = [
  ["Sarah Kim", "Mike Boone", "Jess Rivera", "Tom Hale", "Maya Diaz"],
  ["Jess Rivera", "Maya Diaz", "Mike Boone"],
  ["Drew Park", "Tom Hale", "Sarah Kim"],
  ["Mike Boone", "Drew Park"],
];

function ago(hours: number) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

function scope(m: MediaItem, i: number) {
  return m.media_type === "tv" ? `S1 E${(i % 8) + 1}` : m.genres[0] ?? "Film";
}

export interface FriendOnline {
  name: string;
  username: string | null; // for linking to their profile (/u/username)
  userId: string | null; // real auth user id → enables live DMs; null = demo/mock
  avatar: string | null;
  room: string;
  roomHref: string | null; // link to the room they're in, null if not in one
  status: "online" | "away";
}

export interface SampleContent {
  continueWatching: LibraryItem[];
  watchlist: MediaItem[];
  progress: LibraryItem[];
  discussions: DiscussionCard[];
  reviews: Review[];
  friendActivity: ActivityEvent[];
  friendsOnline: FriendOnline[];
  notifications: { type: string; text: string; time: string; unread: boolean }[];
  safeUpTo: string | null;
}

export const getSampleContent = cache(async (): Promise<SampleContent> => {
  let items: MediaItem[] = [];
  try {
    items = await trending();
  } catch {
    items = [];
  }
  const pick = (i: number) => items[i % Math.max(1, items.length)];

  const continueWatching: LibraryItem[] = items.slice(6, 9).map((m, i) => ({
    media: m,
    season_number: m.media_type === "tv" ? 1 : null,
    episode_number: m.media_type === "tv" ? (i % 6) + 1 : null,
    label:
      m.media_type === "tv"
        ? `S1 · E${(i % 6) + 1}`
        : [m.release_year, m.genres[0]].filter(Boolean).join(" · ") || "Movie",
    percent: [68, 42, 81][i] ?? 55,
  }));

  const watchlist: MediaItem[] = items.slice(9, 14);

  const discussions: DiscussionCard[] = items.slice(14, 18).map((m, i) => ({
    id: `sd${i}`,
    media: m,
    scope: scope(m, i),
    title: DEMO_LINES[i] ?? "Loved this one.",
    comment_count: [1200, 842, 611, 503][i] ?? 300,
    participants: DEMO_PARTICIPANTS[i] ?? ["Sarah Kim", "Mike Boone"],
    created_at: ago([2, 5, 3, 1][i] ?? 4),
  }));

  const REVIEWERS = [PROFILES.maya, PROFILES.drew];
  const REVIEW_BODIES = [
    "This one was everything — the emotional weight, the performances, the silence. A masterpiece.",
    "The world-building here was insane. Can't wait to see where this goes next.",
  ];
  const reviews: Review[] = items.slice(0, 2).map((m, i) => ({
    id: `sr${i}`,
    author: REVIEWERS[i],
    media: { id: m.id, title: m.title },
    season_number: m.media_type === "tv" ? 1 : null,
    episode_number: m.media_type === "tv" ? (i % 6) + 1 : null,
    score: [9.5, 8.7][i] ?? 8,
    body: REVIEW_BODIES[i] ?? "Really enjoyed this.",
    spoiler_scope: "none",
    like_count: [120, 98][i] ?? 40,
    comment_count: [34, 21][i] ?? 10,
    created_at: ago([6, 8][i] ?? 7),
  }));

  const ACTORS = [PROFILES.sarah, PROFILES.mike, PROFILES.jess, PROFILES.tom];
  const VERBS: ActivityEvent["verb"][] = ["joined the room", "rated", "reviewed", "joined the room"];
  const friendActivity: ActivityEvent[] = items.slice(0, 4).map((m, i) => ({
    id: `sa${i}`,
    actor: ACTORS[i],
    verb: VERBS[i],
    target: `${m.title} ${scope(m, i)}`,
    score: VERBS[i] === "rated" ? 8 : undefined,
    created_at: ago([0.03, 0.25, 1, 2][i] ?? 3),
  }));

  const ONLINE = [PROFILES.sarah, PROFILES.mike, PROFILES.jess, PROFILES.tom, PROFILES.maya];
  const ONLINE_STATUS: FriendOnline["status"][] = ["online", "online", "online", "away", "online"];
  const friendsOnline: FriendOnline[] = items.slice(0, 5).map((m, i) => ({
    name: ONLINE[i]?.display_name ?? "Friend",
    username: ONLINE[i]?.username ?? null,
    userId: null, // seeded presence — not real auth users, so DMs run in demo mode
    avatar: ONLINE[i]?.avatar_url ?? null,
    room: m.title,
    roomHref: `/title/${m.id}`,
    status: ONLINE_STATUS[i] ?? "online",
  }));

  const notifications = [
    { type: "reply", text: `Sarah Kim replied to your post in ${pick(0)?.title ?? "a room"} ${scope(pick(0) ?? items[0], 0)}`, time: "2m ago", unread: true },
    { type: "like", text: `Mike Boone liked your review of ${pick(1)?.title ?? "a title"} ${scope(pick(1) ?? items[0], 1)}`, time: "18m ago", unread: true },
    { type: "unlock", text: `Spoiler-safe discussion unlocked for ${pick(2)?.title ?? "a show"} ${scope(pick(2) ?? items[0], 2)}`, time: "1h ago", unread: true },
    { type: "follow", text: "Jess Rivera started following you", time: "3h ago", unread: false },
    { type: "episode", text: `New episode room active: ${pick(3)?.title ?? "a show"} ${scope(pick(3) ?? items[0], 3)}`, time: "5h ago", unread: false },
    { type: "trending", text: `${pick(4)?.title ?? "A show"} ${scope(pick(4) ?? items[0], 4)} is trending — fans are discussing`, time: "8h ago", unread: false },
  ];

  return {
    continueWatching,
    watchlist,
    progress: continueWatching,
    discussions,
    reviews,
    friendActivity,
    friendsOnline,
    notifications,
    safeUpTo: continueWatching[0]
      ? `${continueWatching[0].media.title} ${continueWatching[0].label.replace(" · ", " ")}`
      : null,
  };
});

/* ------------------------------------------------------------------ inbox */

export type NotificationType =
  | "reply"
  | "like"
  | "mention"
  | "follow"
  | "invite"
  | "pinned"
  | "episode"
  | "hidden"
  | "reaction"
  | "report"
  | "warning"
  | "trending"
  | "friend"
  | "poll";

export interface NotifMedia {
  title: string;
  poster: string | null;
  genres: string[];
}

export interface NotificationItem {
  id: string;
  /** icon key — maps to a lucide badge icon in the UI */
  type: NotificationType;
  /** present for social notifications (someone did something) */
  actor?: { name: string; avatar: string | null };
  /**
   * The main line. For social notifications this is the verb phrase after the
   * actor's name ("replied to your comment in"). For system notifications it's
   * the bold headline ("Your report was reviewed").
   */
  action: string;
  /** bold media reference + thumbnail, when the notification is about a title */
  media?: NotifMedia;
  /** muted secondary line — a quote, preview, or description */
  body?: string;
  time: string;
  unread: boolean;
  /** deep link to the related content (title/room) */
  href: string;
}

/** Flattened text for the detail page title / accessibility. */
export function notificationText(n: NotificationItem): string {
  const lead = n.actor ? `${n.actor.name} ${n.action}` : n.action;
  return n.media ? `${lead} ${n.media.title}` : lead;
}

export type MessageKind =
  | "admin"
  | "moderator"
  | "warning"
  | "announcement"
  | "security"
  | "invite"
  | "room"
  | "support"
  | "report"
  | "feature";

export interface MessageQuickLink {
  label: string;
  href: string;
  icon: "bug" | "feedback" | "guide" | "link";
}

export interface MessageItem {
  id: string;
  /** icon key — maps to a lucide icon in the UI */
  kind: MessageKind;
  from: string;
  /** recipient line ("you") */
  to?: string;
  subject: string;
  preview: string;
  /** full message body shown on the detail / reading pane */
  body: string;
  /** optional intro line above the checklist ("Here's what you can do now:") */
  checklistIntro?: string;
  /** optional bulleted checklist */
  checklist?: string[];
  /** optional body text rendered after the checklist */
  bodyAfter?: string;
  /** optional quick-link buttons at the foot of the message */
  quickLinks?: MessageQuickLink[];
  time: string;
  unread: boolean;
  /** brand-new message → "New" badge */
  isNew?: boolean;
  /** starred / important */
  starred?: boolean;
  /** official/system sender styling */
  official?: boolean;
}

export interface InboxData {
  notifications: NotificationItem[];
  messages: MessageItem[];
  unreadNotifications: number;
  unreadMessages: number;
}

/**
 * Bell (activity notifications) + envelope (messages / official inbox) feed.
 * Built from sample TMDb titles so it looks alive; structured so real rows can
 * replace it later without touching the UI.
 */
export const getInbox = cache(async (): Promise<InboxData> => {
  let items: MediaItem[] = [];
  try {
    items = await trending();
  } catch {
    items = [];
  }
  const pick = (i: number) => items[i % Math.max(1, items.length)];
  const media = (i: number): NotifMedia | undefined => {
    const m = pick(i);
    return m ? { title: `${m.title} ${scope(m, i)}`, poster: m.poster_url, genres: m.genres } : undefined;
  };
  const link = (i: number) => {
    const m = pick(i);
    return m ? `/title/${m.id}` : "/notifications";
  };

  const rawNotifications: Omit<NotificationItem, "id">[] = [
    {
      type: "reply",
      actor: { name: "Sarah Kim", avatar: null },
      action: "replied to your comment in",
      media: media(0),
      body: "“Couldn’t agree more! That opening scene gave me chills.”",
      time: "2m ago",
      unread: true,
      href: link(0),
    },
    {
      type: "like",
      actor: { name: "Mike Boone", avatar: null },
      action: "liked your review of",
      media: media(1),
      time: "10m ago",
      unread: true,
      href: link(1),
    },
    {
      type: "follow",
      actor: { name: "Alex Morgan", avatar: null },
      action: "started following you",
      time: "25m ago",
      unread: true,
      href: "/u/alexm",
    },
    {
      type: "invite",
      actor: { name: "Jess Rivera", avatar: null },
      action: "invited you to join a watch room",
      media: media(3),
      time: "1h ago",
      unread: true,
      href: link(3),
    },
    {
      type: "report",
      action: "Your report was reviewed",
      body: `Thank you! We reviewed the content you reported in ${media(4)?.title ?? "a room"}.`,
      time: "2h ago",
      unread: true,
      href: "/notifications",
    },
    {
      type: "episode",
      action: "New episode room is live",
      media: media(5),
      body: `${media(5)?.title ?? "A new episode"} is now open for discussion.`,
      time: "3h ago",
      unread: true,
      href: link(5),
    },
    {
      type: "mention",
      actor: { name: "Tom Hale", avatar: null },
      action: "mentioned you in a comment",
      media: media(6),
      body: "@carnel what did you think of the ending? 🤔",
      time: "5h ago",
      unread: false,
      href: link(6),
    },
    {
      type: "warning",
      action: "Your comment was marked as a spoiler",
      body: "Please review our spoiler policy to avoid future issues.",
      time: "1d ago",
      unread: false,
      href: "/notifications",
    },
    {
      type: "reaction",
      actor: { name: "Drew Park", avatar: null },
      action: "reacted to your rating of",
      media: media(7),
      time: "1d ago",
      unread: false,
      href: link(7),
    },
    {
      type: "pinned",
      action: "New pinned update in a room you joined",
      media: media(8),
      body: "The mods posted a recap and ground rules before the finale drops.",
      time: "1d ago",
      unread: false,
      href: link(8),
    },
    {
      type: "poll",
      action: "Poll results are in",
      media: media(9),
      body: `Results are ready for a poll you voted on in ${media(9)?.title ?? "a room"}.`,
      time: "2d ago",
      unread: false,
      href: link(9),
    },
    {
      type: "friend",
      actor: { name: "Sarah Kim", avatar: null },
      action: "reviewed",
      media: media(10),
      body: "An episode you’ve already watched — safe to read.",
      time: "2d ago",
      unread: false,
      href: link(10),
    },
    {
      type: "trending",
      action: `${media(11)?.title ?? "A show"} is trending`,
      media: media(11),
      body: "Fans on your watchlist are discussing it right now.",
      time: "3d ago",
      unread: false,
      href: link(11),
    },
  ];
  const notifications: NotificationItem[] = rawNotifications.map((n, i) => ({ ...n, id: `n${i}` }));

  const rawMessages: Omit<MessageItem, "id">[] = [
    {
      kind: "admin",
      from: "Watchruum Team",
      to: "you",
      subject: "Welcome to the Beta!",
      preview: "Thanks for joining us as a beta tester. Here's everything you need to know…",
      body: "Welcome aboard!\n\nWe're thrilled to have you as part of our beta testing community. Your feedback is incredibly valuable as we build the best experience for movie and TV lovers.",
      checklistIntro: "Here's what you can do now:",
      checklist: ["Explore rooms and features", "Share your honest feedback", "Report any bugs you encounter"],
      bodyAfter:
        "If you run into any issues, just hit reply to this message. We read every message!\n\nThanks again for being here and helping us build something awesome.\n\n– The Watchruum Team",
      quickLinks: [
        { label: "Report a Bug", href: "/settings", icon: "bug" },
        { label: "Give Feedback", href: "/settings", icon: "feedback" },
        { label: "Beta Guide", href: "/explore", icon: "guide" },
      ],
      time: "2m ago",
      unread: true,
      isNew: true,
      official: true,
    },
    {
      kind: "moderator",
      from: "Moderator Team",
      to: "you",
      subject: "Spoiler Policy Reminder",
      preview: "Hi Carnel, just a reminder to please use spoiler tags when discussing recent episodes…",
      body: "Hi Carnel,\n\nJust a friendly reminder to please use spoiler tags when discussing recent episodes. A couple of recent posts referenced late-season moments without a tag.\n\nTagging finales and big twists keeps rooms safe for people who aren't caught up yet — it's what makes Watchruum work.\n\nThanks for helping keep the community spoiler-safe.\n— The Moderator Team",
      time: "1h ago",
      unread: true,
      official: true,
    },
    {
      kind: "report",
      from: "Support",
      to: "you",
      subject: "Your report has been updated",
      preview: "Good news! The content you reported has been reviewed and action has been taken.",
      body: "Good news!\n\nThe content you reported has been reviewed and action has been taken. We applied a spoiler blur so it stays hidden until readers choose to reveal it.\n\nReports like yours keep every room safe for people who haven't caught up. Thanks for taking the time.\n\n— Watchruum Support",
      time: "3h ago",
      unread: true,
      official: true,
    },
    {
      kind: "feature",
      from: "Watchruum Team",
      to: "you",
      subject: "New Feature: Episode Rooms",
      preview: "We just launched Episode Rooms! Check it out and let us know what you think.",
      body: "We just launched Episode Rooms!\n\nEvery show now has a dedicated room for each episode, so you can talk about exactly what you watched without spoiling anyone ahead — or behind — you.\n\nJump into any show, pick your episode, and dive in. Let us know what you think.\n\n— The Watchruum Team",
      time: "Yesterday",
      unread: false,
      official: true,
    },
    {
      kind: "admin",
      from: "Admin",
      to: "you",
      subject: "Beta Tester Update – May 12",
      preview: "We've made some improvements based on your feedback. See what's new in this update.",
      body: "Here's what's new this week, based on your feedback:\n\n• Faster room loading and smoother scrolling\n• Clearer spoiler badges on every post\n• Genre browsing with A–Z filters and in-genre search\n• A redesigned notifications panel\n\nKeep the feedback coming — it genuinely shapes what we build next.\n\n— The Watchruum Team",
      time: "May 12",
      unread: false,
      official: true,
    },
    {
      kind: "support",
      from: "Support",
      to: "you",
      subject: "Re: Unable to upload avatar",
      preview: "Thanks for reaching out! This issue should be resolved now. Try clearing your cache if you still see problems.",
      body: "Thanks for reaching out!\n\nThis issue should be resolved now. If you still see problems uploading your avatar, try clearing your browser cache and giving it another go.\n\nStill stuck? Just reply here and we'll dig in.\n\n— Watchruum Support",
      time: "May 10",
      unread: false,
      official: true,
    },
  ];
  // Real admin→member messages for the signed-in user, newest first, shown
  // above the sample/official messages. Falls back silently if the table
  // isn't present yet.
  let realMessages: MessageItem[] = [];
  try {
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_messages")
          .select("id, sender_name, subject, body, official, read_at, created_at")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        realMessages = ((data as RawUserMessage[] | null) ?? []).map((r) => ({
          id: `db_${r.id}`,
          kind: "admin" as MessageKind,
          from: r.sender_name || "Watchruum Team",
          to: "you",
          subject: r.subject,
          preview: r.body.length > 140 ? `${r.body.slice(0, 140)}…` : r.body,
          body: r.body,
          time: timeAgo(r.created_at),
          unread: !r.read_at,
          isNew: !r.read_at,
          official: r.official ?? true,
        }));
      }
    }
  } catch {
    /* user_messages table optional (pre-migration) */
  }

  const messages: MessageItem[] = [...realMessages, ...rawMessages.map((m, i) => ({ ...m, id: `m${i}` }))];

  return {
    notifications,
    messages,
    unreadNotifications: notifications.filter((n) => n.unread).length,
    unreadMessages: messages.filter((m) => m.unread).length,
  };
});

interface RawUserMessage {
  id: string;
  sender_name: string | null;
  subject: string;
  body: string;
  official: boolean | null;
  read_at: string | null;
  created_at: string;
}

/** A single notification by id (or null). */
export const getNotification = cache(async (id: string): Promise<NotificationItem | null> => {
  const { notifications } = await getInbox();
  return notifications.find((n) => n.id === id) ?? null;
});

/** A single inbox message by id (or null). */
export const getMessage = cache(async (id: string): Promise<MessageItem | null> => {
  const { messages } = await getInbox();
  return messages.find((m) => m.id === id) ?? null;
});

/* ------------------------------------------------------------------ reviews */

export interface DisplayReview {
  id: string;
  author_name: string;
  author_avatar: string | null;
  season_number: number | null;
  episode_number: number | null;
  score: number;
  body: string;
  spoiler_scope: SpoilerScope;
  image_urls: string[];
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
  lang: string | null;
}

async function reactionCounts(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  ids: string[],
  userId: string | null,
) {
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  if (!ids.length) return { counts, mine };
  const { data } = await supabase
    .from("reactions")
    .select("target_id, user_id")
    .eq("target_type", "review")
    .in("target_id", ids);
  for (const r of (data ?? []) as any[]) {
    counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
    if (userId && r.user_id === userId) mine.add(r.target_id);
  }
  return { counts, mine };
}

/** Real reviews for a given TMDb title (newest first). */
export const getReviewsForMedia = cache(
  async (tmdbId: number, mediaType: "movie" | "tv"): Promise<DisplayReview[]> => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: media } = await supabase
      .from("media_items")
      .select("id")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();
    if (!media) return [];

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: rows } = await supabase
      .from("reviews")
      .select("id, season_number, episode_number, score, body, spoiler_scope, image_urls, lang, created_at, author:profiles(display_name, avatar_url)")
      .eq("media_id", media.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (rows ?? []) as any[];
    const { counts, mine } = await reactionCounts(supabase, list.map((r) => r.id), user?.id ?? null);

    return list.map((r) => ({
      id: r.id,
      author_name: r.author?.display_name ?? "User",
      author_avatar: r.author?.avatar_url ?? null,
      season_number: r.season_number,
      episode_number: r.episode_number,
      score: r.score ?? 0,
      body: r.body,
      spoiler_scope: r.spoiler_scope,
      image_urls: r.image_urls ?? [],
      like_count: counts.get(r.id) ?? 0,
      liked_by_me: mine.has(r.id),
      created_at: r.created_at,
      lang: r.lang ?? null,
    }));
  },
);

export interface PersonComment {
  id: string;
  author_name: string;
  author_avatar: string | null;
  body: string;
  has_spoiler: boolean;
  image_urls: string[];
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
  lang: string | null;
}

/** Fan comments on a single actor (newest first), with like counts. */
export const getPersonComments = cache(async (personTmdbId: number): Promise<PersonComment[]> => {
  const supabase = await createClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("person_comments")
    .select("id, body, has_spoiler, image_urls, lang, created_at, author:profiles(display_name, avatar_url)")
    .eq("person_tmdb_id", personTmdbId)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = (rows ?? []) as any[];
  const ids = list.map((r) => r.id);
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  if (ids.length) {
    const { data: reacts } = await supabase
      .from("reactions")
      .select("target_id, user_id")
      .eq("target_type", "person_comment")
      .in("target_id", ids);
    for (const r of (reacts ?? []) as any[]) {
      counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
      if (user && r.user_id === user.id) mine.add(r.target_id);
    }
  }

  return list.map((r) => ({
    id: r.id,
    author_name: r.author?.display_name ?? "User",
    author_avatar: r.author?.avatar_url ?? null,
    body: r.body,
    has_spoiler: !!r.has_spoiler,
    image_urls: r.image_urls ?? [],
    like_count: counts.get(r.id) ?? 0,
    liked_by_me: mine.has(r.id),
    created_at: r.created_at,
    lang: r.lang ?? null,
  }));
});

/** Recent spoiler-free reviews across the app, for the home feed. */
export const getPopularReviews = cache(async (limit = 2): Promise<Review[]> => {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: rows } = await supabase
    .from("reviews")
    .select("id, season_number, episode_number, score, body, spoiler_scope, created_at, author:profiles(username, display_name, avatar_url), media:media_items(id, tmdb_id, media_type, title)")
    .eq("spoiler_scope", "none")
    .order("created_at", { ascending: false })
    .limit(limit);

  const list = (rows ?? []) as any[];
  const { counts } = await reactionCounts(supabase, list.map((r) => r.id), null);

  return list
    .filter((r) => r.media)
    .map((r) => ({
      id: r.id,
      author: {
        id: "u",
        username: r.author?.username ?? "user",
        display_name: r.author?.display_name ?? "User",
        avatar_url: r.author?.avatar_url ?? null,
        bio: null,
        favorite_genres: [],
      },
      media: { id: routeId(r.media.media_type, r.media.tmdb_id, r.media.title), title: r.media.title },
      season_number: r.season_number,
      episode_number: r.episode_number,
      score: r.score ?? 0,
      body: r.body,
      spoiler_scope: r.spoiler_scope,
      like_count: counts.get(r.id) ?? 0,
      comment_count: 0,
      created_at: r.created_at,
    }));
});

/* ------------------------------------------------------------------ rooms */

export interface RoomMessage {
  id: string;
  author: { id: string; username: string; display_name: string; avatar_url: string | null; is_admin: boolean };
  body: string;
  spoiler_scope: SpoilerScope;
  season_number: number | null;
  episode_number: number | null;
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
  lang: string | null;
}

export interface RoomMember {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  online: boolean;
  message_count: number;
}

export interface RoomFeed {
  configured: boolean;
  viewerId: string | null;
  messages: RoomMessage[];
  members: RoomMember[];
  memberCount: number;
  onlineCount: number;
  progress: import("./spoiler").ViewerProgress | null;
  watchedThisEpisode: boolean;
  watchedEpisodes: number[]; // episode numbers watched in this season
  createdBy: { username: string; display_name: string } | null;
}

/**
 * Everything the episode room needs, from real Supabase data. The "room" is
 * keyed by (media, season, episode); a message belongs to it when its stored
 * season/episode match. Falls back to an empty (but valid) room when Supabase
 * isn't configured or nobody has posted yet.
 */
export const getRoomFeed = cache(
  async (
    tmdbId: number,
    mediaType: "movie" | "tv",
    season: number | null,
    episode: number | null,
  ): Promise<RoomFeed> => {
    const empty: RoomFeed = {
      configured: false,
      viewerId: null,
      messages: [],
      members: [],
      memberCount: 0,
      onlineCount: 0,
      progress: null,
      watchedThisEpisode: false,
      watchedEpisodes: [],
      createdBy: null,
    };

    const supabase = await createClient();
    if (!supabase) return empty;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const viewerId = user?.id ?? null;

    const { data: media } = await supabase
      .from("media_items")
      .select("id")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();

    const isMovie = mediaType === "movie";

    // Viewer progress + watched episodes in this season (needs the media row).
    let progress: import("./spoiler").ViewerProgress | null = null;
    let watchedEpisodes: number[] = [];
    if (viewerId && media) {
      const { data: ws } = await supabase
        .from("watch_status")
        .select("season_number, episode_number, movie_watched")
        .eq("user_id", viewerId)
        .eq("media_id", media.id)
        .maybeSingle();
      if (ws) {
        progress = {
          season_number: (ws as any).season_number,
          episode_number: (ws as any).episode_number,
          movie_watched: (ws as any).movie_watched ?? false,
        };
      }
      if (!isMovie && season != null) {
        const { data: ew } = await supabase
          .from("episode_watches")
          .select("episode_number")
          .eq("user_id", viewerId)
          .eq("media_id", media.id)
          .eq("season_number", season);
        watchedEpisodes = ((ew ?? []) as any[]).map((r) => r.episode_number).filter((n) => n != null);
      }
    }
    const watchedThisEpisode = isMovie
      ? !!progress?.movie_watched
      : episode != null && watchedEpisodes.includes(episode);

    if (!media) {
      return { ...empty, configured: true, viewerId, progress, watchedThisEpisode, watchedEpisodes };
    }

    // Messages posted in this room (this media + season + episode). Movies use
    // null season/episode, so match with `.is` in that case.
    let mq = supabase
      .from("comments")
      .select(
        "id, body, spoiler_scope, season_number, episode_number, lang, created_at, author:profiles(id, username, display_name, avatar_url, is_admin)",
      )
      .eq("media_id", media.id);
    mq = season == null ? mq.is("season_number", null) : mq.eq("season_number", season);
    mq = episode == null ? mq.is("episode_number", null) : mq.eq("episode_number", episode);
    const { data: rows } = await mq.order("created_at", { ascending: true }).limit(200);

    const list = (rows ?? []) as any[];

    // Reaction counts for these comments.
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    if (list.length) {
      const { data: reacts } = await supabase
        .from("reactions")
        .select("target_id, user_id")
        .eq("target_type", "comment")
        .in(
          "target_id",
          list.map((r) => r.id),
        );
      for (const r of (reacts ?? []) as any[]) {
        counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
        if (viewerId && r.user_id === viewerId) mine.add(r.target_id);
      }
    }

    const messages: RoomMessage[] = list
      .filter((r) => r.author)
      .map((r) => ({
        id: r.id,
        author: {
          id: r.author.id,
          username: r.author.username ?? "member",
          display_name: r.author.display_name ?? "Member",
          avatar_url: r.author.avatar_url ?? null,
          is_admin: !!r.author.is_admin,
        },
        body: r.body,
        spoiler_scope: r.spoiler_scope,
        season_number: r.season_number,
        episode_number: r.episode_number,
        like_count: counts.get(r.id) ?? 0,
        liked_by_me: mine.has(r.id),
        created_at: r.created_at,
        lang: r.lang ?? null,
      }));

    // Members = distinct authors in this room (real participation).
    const memberMap = new Map<string, RoomMember>();
    for (const m of messages) {
      const prev = memberMap.get(m.author.id);
      if (prev) prev.message_count += 1;
      else
        memberMap.set(m.author.id, {
          ...m.author,
          online: false,
          message_count: 1,
        });
    }
    const members = [...memberMap.values()].sort((a, b) => b.message_count - a.message_count);
    // Mark the most recent posters as "online" (illustrative presence).
    const recent = new Set(messages.slice(-6).map((m) => m.author.id));
    for (const mem of members) mem.online = recent.has(mem.id);

    const createdBy = members[0] ? { username: members[0].username, display_name: members[0].display_name } : null;

    return {
      configured: true,
      viewerId,
      messages,
      members,
      memberCount: members.length,
      onlineCount: members.filter((m) => m.online).length,
      progress,
      watchedThisEpisode,
      watchedEpisodes,
      createdBy,
    };
  },
);

/**
 * Server-side reads of the signed-in user's real library.
 * Returns null when Supabase isn't configured or nobody is signed in —
 * callers then fall back to sample data (logged-out marketing view).
 * Wrapped in React cache() so layout + page share one fetch per request.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function rowToMedia(m: any): MediaItem {
  return {
    // Public slug route id (e.g. "the-odyssey-movie-123"); /title/[id] resolves via TMDb.
    id: routeId(m.media_type, m.tmdb_id, m.title),
    tmdb_id: m.tmdb_id,
    media_type: m.media_type,
    title: m.title,
    overview: m.overview ?? "",
    poster_url: m.poster_url ?? null,
    backdrop_url: m.backdrop_url ?? null,
    release_year: m.release_year ?? null,
    genres: m.genres ?? [],
    vote_average: Number(m.vote_average ?? 0),
    number_of_seasons: m.number_of_seasons ?? undefined,
  };
}

export interface LibraryItem {
  media: MediaItem;
  season_number: number | null;
  episode_number: number | null;
  label: string;
  percent: number;
}

export interface UserLibrary {
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_admin: boolean;
    is_moderator: boolean;
  } | null;
  continueWatching: LibraryItem[];
  watchlist: MediaItem[];
  furthest: LibraryItem | null;
}

export const getUserLibrary = cache(async (): Promise<UserLibrary | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: rows }, { data: watches }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url, is_admin, is_moderator").eq("id", user.id).maybeSingle(),
    supabase
      .from("watch_status")
      .select("season_number, episode_number, movie_watched, in_watchlist, updated_at, media:media_items(*)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase.from("episode_watches").select("media_id").eq("user_id", user.id),
  ]);

  const watchedCount = new Map<string, number>();
  for (const w of watches ?? []) {
    // episode_watches.media_id is the DB uuid; count per media row
    watchedCount.set(w.media_id as string, (watchedCount.get(w.media_id as string) ?? 0) + 1);
  }

  const continueWatching: LibraryItem[] = [];
  const watchlist: MediaItem[] = [];

  for (const r of (rows ?? []) as any[]) {
    if (!r.media) continue;
    const media = rowToMedia(r.media);
    if (r.in_watchlist) watchlist.push(media);

    const inProgress = r.episode_number != null || r.movie_watched;
    if (!inProgress) continue;

    let percent = 0;
    if (media.media_type === "movie") {
      percent = r.movie_watched ? 100 : 0;
    } else {
      const total = await getShowEpisodeCount(media.id).catch(() => null);
      const c = watchedCount.get(r.media.id) ?? 0;
      percent = total ? Math.min(100, Math.round((c / total) * 100)) : Math.min(95, c * 8);
    }

    continueWatching.push({
      media,
      season_number: r.season_number,
      episode_number: r.episode_number,
      label:
        r.episode_number != null
          ? `S${r.season_number} · E${r.episode_number}`
          : media.media_type === "movie"
            ? "Movie"
            : "Started",
      percent,
    });
  }

  return {
    profile: profile ?? null,
    continueWatching,
    watchlist,
    furthest: continueWatching[0] ?? null,
  };
});
