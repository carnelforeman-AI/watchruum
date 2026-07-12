"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  Flag,
  Pin,
  X,
  Smile,
  ImageIcon,
  Clock,
  Lock,
  ChevronDown,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SpoilerTag } from "@/components/room/spoiler-standard";
import { TranslatableText } from "@/components/i18n/translatable-text";
import { cn, timeAgo } from "@/lib/utils";
import { evaluateSpoiler, hiddenReason, postTag, type ViewerProgress } from "@/lib/spoiler";
import { markEpisodeWatched, markMovieWatched, postComment, reportContent, toggleReaction } from "@/app/actions";
import type { MediaItem, SpoilerScope } from "@/lib/types";
import type { RoomMessage } from "@/lib/queries";

const TV_SCOPES: { value: SpoilerScope; label: string }[] = [
  { value: "none", label: "No spoilers" },
  { value: "episode", label: "This episode" },
  { value: "season", label: "This season" },
  { value: "series", label: "Whole series" },
];
const MOVIE_SCOPES: { value: SpoilerScope; label: string }[] = [
  { value: "none", label: "No spoilers" },
  { value: "series", label: "Spoilers" },
];

/** Highest of two progress points (keeps whatever the viewer already unlocked). */
function point(p: ViewerProgress | null): number {
  if (!p) return -1;
  return (p.season_number ?? 0) * 1000 + (p.episode_number ?? 0);
}

export function RoomChat({
  media,
  season,
  episode,
  safeLabel,
  initialMessages,
  viewerId,
  viewerName,
  progress,
  watchedThisEpisode,
  isMovie = false,
  viewerLang = null,
}: {
  media: MediaItem;
  season: number | null;
  episode: number | null;
  safeLabel: string; // e.g. "S2 E4" (tv) — ignored for movies
  initialMessages: RoomMessage[];
  viewerId: string | null;
  viewerName: string | null;
  progress: ViewerProgress | null;
  watchedThisEpisode: boolean;
  isMovie?: boolean;
  viewerLang?: string | null;
}) {
  const scopes = isMovie ? MOVIE_SCOPES : TV_SCOPES;
  const [messages, setMessages] = useState<RoomMessage[]>(initialMessages);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [localWatched, setLocalWatched] = useState(watchedThisEpisode);
  const [override, setOverride] = useState(false);
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<SpoilerScope>(isMovie ? "none" : "episode");
  const [scopeOpen, setScopeOpen] = useState(false);
  const [pending, start] = useTransition();

  // What the room is "about", for copy.
  const roomTitle = isMovie ? media.title : `${media.title} ${safeLabel}`;

  // Spoiler chip for a chosen scope (movies use a simpler Safe/Spoiler split).
  const chipTag = (sc: SpoilerScope): { state: "safe" | "series"; label: string } | ReturnType<typeof postTag> =>
    isMovie
      ? sc === "none"
        ? { state: "safe", label: "Safe" }
        : { state: "series", label: "Spoiler" }
      : postTag(sc, season, episode);

  const unlocked = localWatched || override;
  const roomPoint = isMovie ? 0 : (season ?? 0) * 1000 + (episode ?? 0);
  // Effective progress used to evaluate messages — never lower than what the
  // viewer already unlocked elsewhere.
  const effProgress: ViewerProgress | null = isMovie
    ? unlocked
      ? { season_number: null, episode_number: null, movie_watched: true }
      : progress
    : unlocked
      ? point(progress) >= roomPoint
        ? progress
        : { season_number: season, episode_number: episode, movie_watched: true }
      : progress;

  function markWatched() {
    setLocalWatched(true);
    start(() => {
      if (isMovie) markMovieWatched(media, true);
      else markEpisodeWatched(media, season as number, episode as number);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !viewerId) return;
    const optimistic: RoomMessage = {
      id: `local_${Date.now()}`,
      author: {
        id: viewerId,
        username: "you",
        display_name: viewerName ?? "You",
        avatar_url: null,
        is_admin: false,
      },
      body: text,
      spoiler_scope: scope,
      season_number: season,
      episode_number: episode,
      like_count: 0,
      liked_by_me: false,
      created_at: new Date().toISOString(),
      lang: null,
    };
    setMessages((m) => [...m, optimistic]);
    setBody("");
    start(async () => {
      // Store the room key (season/episode, or null/null for movies); scope
      // carries the spoiler reach.
      const res = await postComment(media, season, episode, text, scope);
      if (res.id) {
        setMessages((m) => m.map((x) => (x.id === optimistic.id ? { ...x, id: res.id! } : x)));
      }
    });
  }

  // Locked state: the whole chat is gated until the viewer marks the episode
  // watched (or explicitly reveals). This is the "unlock chat" moment.
  if (!unlocked) {
    return (
      <div className="glass flex flex-col overflow-hidden rounded-2xl">
        <div className="relative grid min-h-[440px] place-items-center overflow-hidden p-8 text-center">
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.25),transparent_55%)]" />
          <div className="relative z-10 mx-auto max-w-md">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Lock className="size-6" />
            </span>
            <h3 className="text-xl font-bold">Discussion is locked</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              To keep you spoiler-safe, the chat for{" "}
              <span className="font-semibold text-foreground">{roomTitle}</span>{" "}
              unlocks once you mark {isMovie ? "the movie" : "this episode"} watched. Post, react, and reveal the
              moment you do.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" onClick={markWatched} disabled={pending}>
                <ShieldCheck className="size-4" /> Mark as watched
              </Button>
              <Button variant="ghost" size="lg" onClick={() => setOverride(true)}>
                <Eye className="size-4" /> Show spoilers anyway
              </Button>
            </div>
            <p className="mt-4 text-[12px] text-muted-2">
              You control when discussion unlocks. Spoilers stay hidden either way.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass flex flex-col overflow-hidden rounded-2xl">
      {/* Safe zone banner */}
      {bannerOpen && (
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/15 to-accent/10 px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-primary">You&apos;re in the Safe Zone</p>
            <p className="text-[12px] text-muted">
              {isMovie ? "Spoilers are tagged and hidden until you've watched." : `No spoilers beyond ${safeLabel} in this chat.`}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-lg border border-border bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-semibold text-muted sm:inline">
            Learn more
          </span>
          <button
            onClick={() => setBannerOpen(false)}
            aria-label="Dismiss"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Unlock bar when the viewer hasn't marked this episode watched */}
      {!unlocked && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-warn/[0.06] px-4 py-3">
          <Lock className="size-4 text-warn" />
          <p className="min-w-0 flex-1 text-[13px] text-muted">
            Mark <span className="font-semibold text-foreground">{media.title} {safeLabel}</span> watched to unlock the
            Safe Zone discussion.
          </p>
          <Button size="sm" onClick={markWatched} disabled={pending}>
            <ShieldCheck className="size-4" /> Mark watched
          </Button>
          <button
            onClick={() => setOverride(true)}
            className="text-[13px] font-semibold text-muted-2 hover:text-foreground"
          >
            Show anyway
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="max-h-[62vh] min-h-[320px] space-y-1 overflow-y-auto p-3 sm:p-4">
        {/* Pinned mod welcome */}
        <div className="mb-2 rounded-xl border border-primary/25 bg-primary/[0.06] p-3.5">
          <div className="mb-1 flex items-center gap-2 text-[12px] text-muted-2">
            <Pin className="size-3.5 text-primary" /> Pinned by Room Mod
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">Mod</span>
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/90">
            {isMovie
              ? "Welcome to the Safe Zone! Tag anything that spoils the movie so fans who haven't watched stay safe."
              : `Welcome to the Safe Zone! Please keep all spoilers up to ${safeLabel}. Use spoiler tags for anything beyond.`}
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <div className="mx-auto max-w-xs">
              <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <MessageCircle className="size-6" />
              </span>
              <p className="text-[15px] font-bold">Start the conversation</p>
              <p className="mt-1 text-[13px] text-muted-2">
                Be the first to react to {roomTitle}.{" "}
                {isMovie ? "Fans who've seen it are here." : "Fans at your exact episode are here."}
              </p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              progress={effProgress}
              isMe={m.author.id === viewerId}
              isMovie={isMovie}
              viewerLang={viewerLang}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3 sm:p-4">
        {viewerId ? (
          <form onSubmit={submit}>
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col rounded-xl border border-border bg-white/[0.03] focus-within:border-primary/60">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Message the room…"
                  aria-label="Message the room"
                  className="w-full bg-transparent px-3.5 py-3 text-sm placeholder:text-muted-2 focus:outline-none"
                />
              </div>
              <div className="relative">
                <Button type="submit" disabled={!body.trim() || pending} className="rounded-xl">
                  Send
                </Button>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-muted-2">
                <IconBtn icon={Smile} aria-label="Add emoji" />
                <IconBtn icon={ImageIcon} aria-label="Attach image" />
                {/* Spoiler-scope selector — the episode tag is forced, scope is chosen */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setScopeOpen((v) => !v)}
                    className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:text-foreground"
                  >
                    <SpoilerTag {...chipTag(scope)} />
                    <ChevronDown className="size-3.5" />
                  </button>
                  {scopeOpen && (
                    <button aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setScopeOpen(false)} />
                  )}
                  {scopeOpen && (
                    <div className="absolute bottom-full left-0 z-20 mb-1.5 w-44 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-xl">
                      {scopes.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => {
                            setScope(o.value);
                            setScopeOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] hover:bg-white/5",
                            scope === o.value && "text-foreground",
                          )}
                        >
                          {o.label}
                          <SpoilerTag {...chipTag(o.value)} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[12px] text-muted-2">
                <Clock className="size-3.5" /> Tagged to {roomTitle}
              </span>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white/[0.03] px-4 py-3">
            <p className="text-[13px] text-muted">Sign in to join the conversation.</p>
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  icon: Icon,
  "aria-label": ariaLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="grid size-8 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}

/* ------------------------------------------------------------------ */

function MessageRow({
  message,
  progress,
  isMe,
  isMovie,
  viewerLang,
}: {
  message: RoomMessage;
  progress: ViewerProgress | null;
  isMe: boolean;
  isMovie: boolean;
  viewerLang: string | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(message.liked_by_me);
  const [likes, setLikes] = useState(message.like_count);
  const [reported, setReported] = useState(false);
  const [, start] = useTransition();

  const state = evaluateSpoiler(
    {
      spoiler_scope: message.spoiler_scope,
      season_number: message.season_number,
      episode_number: message.episode_number,
    },
    progress,
    isMovie,
  );
  const hidden = state !== "safe" && !revealed;
  const tag = isMovie
    ? { state: "series" as const, label: "Spoiler" }
    : postTag(message.spoiler_scope, message.season_number, message.episode_number);
  const spoilery = isMovie
    ? message.spoiler_scope !== "none"
    : message.spoiler_scope === "season" || message.spoiler_scope === "series";
  const nameTagLabel = isMovie ? "SPOILERS" : `SPOILER: ${tag.label}`;

  function like() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    if (!message.id.startsWith("local_")) {
      start(() => {
        toggleReaction("comment", message.id, next);
      });
    }
  }

  function report() {
    setReported(true);
    if (!message.id.startsWith("local_")) {
      start(() => {
        reportContent("comment", message.id, "Unmarked spoiler");
      });
    }
  }

  return (
    <div className="group flex gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.02]">
      <Link href={`/u/${message.author.username}`} className="shrink-0">
        <Avatar name={message.author.display_name} src={message.author.avatar_url} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/u/${message.author.username}`}
            className="text-[13px] font-semibold hover:underline"
          >
            {message.author.display_name}
          </Link>
          {message.author.is_admin && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">Mod</span>
          )}
          <span className="text-[11px] text-muted-2">{timeAgo(message.created_at)}</span>
          {spoilery && <SpoilerTag state={tag.state} label={nameTagLabel} />}
        </div>

        {hidden ? (
          <div className="mt-1.5 rounded-xl border border-border bg-white/[0.02] p-3">
            <p className="flex items-center gap-2 text-[13px] text-muted">
              <EyeOff className="size-4 shrink-0" />
              {hiddenReason(
                {
                  spoiler_scope: message.spoiler_scope,
                  season_number: message.season_number,
                  episode_number: message.episode_number,
                },
                progress,
              )}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Button size="sm" onClick={() => setRevealed(true)}>
                <Eye className="size-4" /> Reveal Spoiler
              </Button>
              <button
                onClick={report}
                className={cn("text-[12px] font-semibold hover:text-warn", reported ? "text-warn" : "text-muted-2")}
              >
                {reported ? "Reported" : "Report Spoiler"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <TranslatableText
              text={message.body}
              sourceLang={message.lang}
              targetLang={viewerLang}
              contentType="comment"
              contentId={message.id}
              className="mt-0.5 text-[14px] leading-relaxed text-foreground/90"
            />
            <div className="mt-1.5 flex items-center gap-4 text-[12px] text-muted-2">
              <button
                onClick={like}
                aria-label="Like"
                className={cn("flex items-center gap-1.5 hover:text-foreground", liked && "text-danger")}
              >
                <Heart className={cn("size-3.5", liked && "fill-danger")} /> {likes > 0 ? likes : ""}
              </button>
              <button className="flex items-center gap-1.5 hover:text-foreground">
                <MessageCircle className="size-3.5" /> Reply
              </button>
              {!isMe && (
                <button
                  onClick={report}
                  className={cn(
                    "opacity-0 transition-opacity hover:text-warn group-hover:opacity-100",
                    reported && "text-warn opacity-100",
                  )}
                  aria-label="Report"
                >
                  <Flag className="size-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
