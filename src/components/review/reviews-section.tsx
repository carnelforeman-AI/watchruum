"use client";

import { useState, useTransition } from "react";
import { Star, Heart, Flag, Eye, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StarRating } from "@/components/media/rating";
import { cn, timeAgo } from "@/lib/utils";
import { postReview, toggleReaction, reportContent } from "@/app/actions";
import type { MediaItem } from "@/lib/types";
import type { DisplayReview } from "@/lib/queries";

export function ReviewsSection({
  media,
  initialReviews,
}: {
  media: MediaItem;
  initialReviews: DisplayReview[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [score, setScore] = useState(0);
  const [body, setBody] = useState("");
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || score === 0) return;
    const scope = hasSpoilers ? "series" : "none";
    const optimistic: DisplayReview = {
      id: `local_${Date.now()}`,
      author_name: "You",
      author_avatar: null,
      season_number: null,
      episode_number: null,
      score,
      body: body.trim(),
      spoiler_scope: scope,
      like_count: 0,
      liked_by_me: false,
      created_at: new Date().toISOString(),
    };
    setReviews((r) => [optimistic, ...r]);
    const text = body.trim();
    setScore(0);
    setBody("");
    setHasSpoilers(false);
    start(() => {
      postReview(media, null, null, optimistic.score, text, scope);
    });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <PenLine className="size-5 text-primary" /> Reviews
      </h2>

      {/* Composer */}
      <form onSubmit={submit} className="glass mb-4 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold">Your rating</span>
          <StarRating value={score} onChange={setScore} />
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Share your thoughts on ${media.title}…`}
          className="mt-3"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setHasSpoilers((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              hasSpoilers
                ? "border-warn/50 bg-warn/15 text-warn"
                : "border-safe/40 bg-safe/10 text-safe",
            )}
          >
            {hasSpoilers ? "Contains spoilers" : "Spoiler-free"}
          </button>
          <Button type="submit" size="sm" disabled={!body.trim() || score === 0}>
            <Sparkles className="size-3.5" /> Post review
          </Button>
        </div>
      </form>

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white/[0.02] p-6 text-center text-sm text-muted-2">
          No reviews yet. Be the first to review {media.title}.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reviews.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewItem({ review }: { review: DisplayReview }) {
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(review.liked_by_me);
  const [likes, setLikes] = useState(review.like_count);
  const [reported, setReported] = useState(false);
  const [reportErr, setReportErr] = useState<string | null>(null);
  const [, start] = useTransition();

  function report() {
    setReportErr(null);
    start(async () => {
      const res = await reportContent("review", review.id, "Unmarked spoiler");
      if (res.ok) setReported(true);
      else setReportErr(res.error ?? "Couldn't report this review.");
    });
  }

  const spoiler = review.spoiler_scope !== "none";
  const hidden = spoiler && !revealed;

  function like() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    start(() => {
      toggleReaction("review", review.id, next);
    });
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={review.author_name} src={review.author_avatar} size="sm" />
          <div>
            <p className="text-sm font-semibold">{review.author_name}</p>
            <p className="text-[11px] text-muted-2">{timeAgo(review.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-warn">
          <Star className="size-4 fill-warn" />
          <span className="text-sm font-bold">{review.score}</span>
          <span className="text-[11px] text-muted-2">/10</span>
        </div>
      </div>

      <div className="mt-2">
        {spoiler ? (
          <Badge variant="warn">Contains Spoilers</Badge>
        ) : (
          <Badge variant="safe">Spoiler-Free</Badge>
        )}
      </div>

      {hidden ? (
        <div className="mt-3 rounded-xl border border-warn/30 bg-warn/5 p-3">
          <p className="text-[13px] text-muted">This review contains spoilers.</p>
          <button
            onClick={() => setRevealed(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-warn hover:brightness-110"
          >
            <Eye className="size-3.5" /> Reveal anyway
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.body}</p>
      )}

      <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-2">
        <button
          onClick={like}
          className={cn("flex items-center gap-1.5 transition-colors hover:text-foreground", liked && "text-danger")}
        >
          <Heart className={cn("size-3.5", liked && "fill-danger")} /> {likes}
        </button>
        <button
          onClick={report}
          disabled={reported}
          className={cn("ml-auto flex items-center gap-1.5 hover:text-warn disabled:opacity-70", reported && "text-warn")}
          title={reportErr ?? undefined}
        >
          <Flag className="size-3.5" /> {reported ? "Reported" : reportErr ? "Try again" : "Report"}
        </button>
      </div>
      {reportErr && <p className="mt-1.5 text-right text-[11px] text-danger">{reportErr}</p>}
    </div>
  );
}
