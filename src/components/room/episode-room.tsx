"use client";

import { useState, useTransition } from "react";
import { Lock, Eye, ShieldCheck, Heart, MessageCircle, Send, Flag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StarRating } from "@/components/media/rating";
import { cn, timeAgo, compact } from "@/lib/utils";
import { evaluateSpoiler, spoilerMeta, hiddenReason, scopeLabel } from "@/lib/spoiler";
import { markEpisodeWatched, rate, postComment, reportContent } from "@/app/actions";
import type { Comment, MediaItem, SpoilerScope } from "@/lib/types";

const SCOPE_OPTIONS: { value: SpoilerScope; label: string }[] = [
  { value: "none", label: "No spoilers" },
  { value: "episode", label: "This episode" },
  { value: "season", label: "This season" },
  { value: "series", label: "Whole series" },
];

export function EpisodeRoom({
  media,
  season,
  episode,
  initialComments,
  initiallyWatched,
}: {
  media: MediaItem;
  season: number;
  episode: number;
  initialComments: Comment[];
  initiallyWatched: boolean;
}) {
  const [watched, setWatched] = useState(initiallyWatched);
  const [override, setOverride] = useState(false);
  const [pending, start] = useTransition();

  const revealed = watched || override;

  function handleMarkWatched() {
    setWatched(true);
    start(() => {
      markEpisodeWatched(media, season, episode);
    });
  }

  return (
    <div className="space-y-6">
      {!revealed ? (
        <SpoilerGate
          media={media}
          season={season}
          episode={episode}
          onWatched={handleMarkWatched}
          onReveal={() => setOverride(true)}
          pending={pending}
        />
      ) : (
        <>
          {!watched && override && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              <Eye className="size-4" /> Spoilers revealed manually. You haven&apos;t marked this
              episode watched.
            </div>
          )}
          <RateBlock media={media} season={season} episode={episode} />
          <Discussion
            media={media}
            season={season}
            episode={episode}
            watched={watched}
            comments={initialComments}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SpoilerGate({
  media,
  season,
  episode,
  onWatched,
  onReveal,
  pending,
}: {
  media: MediaItem;
  season: number;
  episode: number;
  onWatched: () => void;
  onReveal: () => void;
  pending: boolean;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-8 text-center">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.25),transparent_55%)]" />
      <div className="relative z-10 mx-auto max-w-md">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
          <Lock className="size-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold">Discussion is locked</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          To keep you spoiler-safe, the discussion for{" "}
          <span className="font-semibold text-foreground">
            {media.title} {scopeLabel(season, episode)}
          </span>{" "}
          stays hidden until you mark it watched. Rate, react, review and comment unlock
          the moment you do.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={onWatched} disabled={pending} size="lg">
            <ShieldCheck /> Mark as watched
          </Button>
          <Button onClick={onReveal} variant="ghost" size="lg">
            <Eye /> Show spoilers anyway
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RateBlock({
  media,
  season,
  episode,
}: {
  media: MediaItem;
  season: number;
  episode: number;
}) {
  const [score, setScore] = useState(0);
  const [saved, setSaved] = useState(false);
  const [, start] = useTransition();

  function onRate(v: number) {
    setScore(v);
    setSaved(true);
    start(() => {
      rate(media, v, season, episode);
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Rate this episode</p>
          <p className="text-[12px] text-muted-2">React without ruining it for anyone else.</p>
        </div>
        <StarRating value={score} onChange={onRate} />
      </div>
      {saved && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-safe">
          <Sparkles className="size-3.5" /> Saved your {score}/10 for {scopeLabel(season, episode)}.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {["🔥 Loved it", "😱 Shocked", "😭 Emotional", "🤯 Mind-blown", "😂 Hilarious"].map((r) => (
          <button
            key={r}
            className="rounded-full border border-border bg-white/5 px-3 py-1.5 text-[13px] transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Discussion({
  media,
  season,
  episode,
  watched,
  comments: initial,
}: {
  media: MediaItem;
  season: number;
  episode: number;
  watched: boolean;
  comments: Comment[];
}) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<SpoilerScope>("episode");
  const [, start] = useTransition();

  const progress = watched
    ? { season_number: season, episode_number: episode, movie_watched: false }
    : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const optimistic: Comment = {
      id: `local_${comments.length + 1}`,
      author: { id: "me", username: "you", display_name: "You", avatar_url: null, bio: "", favorite_genres: [] },
      body: body.trim(),
      spoiler_scope: scope,
      season_number: scope === "series" ? null : season,
      episode_number: scope === "episode" ? episode : null,
      like_count: 0,
      created_at: new Date().toISOString(),
    };
    setComments((c) => [optimistic, ...c]);
    const text = body.trim();
    setBody("");
    start(() => {
      postComment(media, optimistic.season_number, optimistic.episode_number, text, scope);
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="size-4 text-primary" />
        <h3 className="text-base font-semibold">Episode Discussion</h3>
        <Badge variant="neutral">{compact(comments.length)}</Badge>
      </div>

      {/* Composer — episode tag is forced */}
      <form onSubmit={submit} className="mb-5 rounded-xl border border-border bg-white/[0.03] p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Share your reaction to ${scopeLabel(season, episode)}…`}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-2">Spoiler level:</span>
            <div className="flex flex-wrap gap-1">
              {SCOPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setScope(o.value)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                    scope === o.value
                      ? "border-primary/50 bg-primary/15 text-foreground"
                      : "border-border bg-white/5 text-muted hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" size="sm" disabled={!body.trim()}>
            <Send className="size-3.5" /> Post
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-2">
          Tagged to <span className="font-semibold text-muted">{media.title} {scopeLabel(season, episode)}</span> — this keeps others spoiler-safe.
        </p>
      </form>

      <div className="space-y-3">
        {comments.map((c) => (
          <CommentRow key={c.id} comment={c} progress={progress} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CommentRow({
  comment,
  progress,
}: {
  comment: Comment;
  progress: { season_number: number; episode_number: number; movie_watched: boolean } | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reported, setReported] = useState(false);

  const state = evaluateSpoiler(
    {
      spoiler_scope: comment.spoiler_scope,
      season_number: comment.season_number,
      episode_number: comment.episode_number,
    },
    progress,
    false,
  );
  const meta = spoilerMeta(state);
  const hidden = state !== "safe" && !revealed;

  if (hidden) {
    return (
      <div className="rounded-xl border border-border bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <Lock className="size-4" style={{ color: meta.color }} />
          <Badge
            style={{ color: meta.color, borderColor: `${meta.color}66`, background: `${meta.color}22` }}
          >
            {meta.label}
          </Badge>
        </div>
        <p className="mt-2 text-[13px] text-muted">
          {hiddenReason(
            {
              spoiler_scope: comment.spoiler_scope,
              season_number: comment.season_number,
              episode_number: comment.episode_number,
            },
            progress,
          )}
        </p>
        <button
          onClick={() => setRevealed(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-foreground"
        >
          <Eye className="size-3.5" /> Reveal anyway
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-soft bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={comment.author.display_name} size="sm" />
          <div>
            <p className="text-[13px] font-semibold">{comment.author.display_name}</p>
            <p className="text-[11px] text-muted-2">{timeAgo(comment.created_at)}</p>
          </div>
        </div>
        <Badge
          variant="neutral"
          style={{ color: meta.color, borderColor: `${meta.color}66` }}
        >
          {scopeLabel(comment.season_number, comment.episode_number)}
        </Badge>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-foreground/90">{comment.body}</p>
      <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-2">
        <button
          onClick={() => setLiked((v) => !v)}
          className={cn("flex items-center gap-1.5 transition-colors hover:text-foreground", liked && "text-danger")}
        >
          <Heart className={cn("size-3.5", liked && "fill-danger")} />
          {comment.like_count + (liked ? 1 : 0)}
        </button>
        <button className="flex items-center gap-1.5 hover:text-foreground">
          <MessageCircle className="size-3.5" /> Reply
        </button>
        <button
          onClick={() => {
            setReported(true);
            reportContent("comment", comment.id, "Unmarked spoiler");
          }}
          className={cn("ml-auto flex items-center gap-1.5 hover:text-warn", reported && "text-warn")}
        >
          <Flag className="size-3.5" /> {reported ? "Reported" : "Report spoiler"}
        </button>
      </div>
    </div>
  );
}
