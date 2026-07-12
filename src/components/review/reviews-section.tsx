"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  Star,
  Heart,
  Flag,
  Eye,
  EyeOff,
  PenLine,
  Sparkles,
  ShieldCheck,
  ImagePlus,
  MessageCircle,
  Send,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StarRating } from "@/components/media/rating";
import { TranslatableText } from "@/components/i18n/translatable-text";
import { cn, timeAgo, compact } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SortSelect, sortByKey, type SortKey } from "@/components/ui/comment-sort";
import { postReview, toggleReaction, reportContent, unreportContent, loadReviewComments, postReviewComment } from "@/app/actions";
import type { MediaItem } from "@/lib/types";
import type { DisplayReview, ReviewComment } from "@/lib/queries";

const MAX_IMAGES = 4;
const MAX_IMG_BYTES = 5 * 1024 * 1024; // 5 MB

export function ReviewsSection({
  media,
  initialReviews,
  viewerLang = null,
}: {
  media: MediaItem;
  initialReviews: DisplayReview[];
  viewerLang?: string | null;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [score, setScore] = useState(0);
  const [body, setBody] = useState("");
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("liked");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, start] = useTransition();

  // Aggregate counts for the summary bar. Placeholder titles show seeded
  // totals so the wall looks established; real titles show live sums.
  const demoMode = reviews.some((r) => r.demo);
  const totalReviews = demoMode ? 1245 : reviews.length;
  const totalLikes = demoMode ? 1100 : reviews.reduce((s, r) => s + r.like_count, 0);
  const totalComments = demoMode ? 342 : reviews.reduce((s, r) => s + r.comment_count, 0);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setUploadErr(null);

    const sb = createClient();
    if (!sb) {
      setUploadErr("Storage isn't configured.");
      return;
    }
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setUploadErr("Sign in to attach screenshots.");
      return;
    }

    setUploading(true);
    try {
      const room = MAX_IMAGES - images.length;
      for (const file of files.slice(0, Math.max(0, room))) {
        if (!file.type.startsWith("image/")) {
          setUploadErr("Only image files can be attached.");
          continue;
        }
        if (file.size > MAX_IMG_BYTES) {
          setUploadErr("Each screenshot must be under 5 MB.");
          continue;
        }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error } = await sb.storage
          .from("review-images")
          .upload(path, file, { cacheControl: "3600", contentType: file.type });
        if (error) {
          setUploadErr(error.message);
          continue;
        }
        const { data } = sb.storage.from("review-images").getPublicUrl(path);
        setImages((im) => [...im, data.publicUrl]);
      }
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // Shared post path — used by both the inline composer and the drawer composer.
  function addReview(nextScore: number, text: string, spoilers: boolean, imgs: string[]) {
    const scope: DisplayReview["spoiler_scope"] = spoilers ? "series" : "none";
    const optimistic: DisplayReview = {
      id: `local_${Date.now()}`,
      author_name: "You",
      author_avatar: null,
      season_number: null,
      episode_number: null,
      score: nextScore,
      body: text,
      spoiler_scope: scope,
      image_urls: imgs,
      like_count: 0,
      liked_by_me: false,
      comment_count: 0,
      replies: [],
      created_at: new Date().toISOString(),
      lang: null,
    };
    setReviews((r) => [optimistic, ...r]);
    setSort("newest"); // surface the just-posted review at the top
    start(() => {
      postReview(media, null, null, nextScore, text, scope, imgs);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || score === 0) return;
    addReview(score, body.trim(), hasSpoilers, images);
    setScore(0);
    setBody("");
    setHasSpoilers(false);
    setImages([]);
    setUploadErr(null);
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <PenLine className="size-5 text-primary" /> Reviews
        </h2>
        {reviews.length > 1 && <SortSelect value={sort} onChange={setSort} />}
      </div>

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
          aria-label="Your review"
          className="mt-3"
        />

        {/* Attached screenshots */}
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((u, i) => (
              <div key={u} className="relative size-20 overflow-hidden rounded-lg ring-1 ring-border">
                <img src={u} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((im) => im.filter((x) => x !== u))}
                  aria-label="Remove screenshot"
                  className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/70 text-white transition hover:bg-black"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {uploadErr && <p className="mt-2 text-[12px] text-danger">{uploadErr}</p>}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Spoiler / safe selector */}
            <div className="inline-flex rounded-full border border-border bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setHasSpoilers(false)}
                aria-pressed={!hasSpoilers}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  !hasSpoilers ? "bg-safe/15 text-safe" : "text-muted-2 hover:text-foreground",
                )}
              >
                <ShieldCheck className="size-3.5" /> Spoiler-free
              </button>
              <button
                type="button"
                onClick={() => setHasSpoilers(true)}
                aria-pressed={hasSpoilers}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  hasSpoilers ? "bg-warn/15 text-warn" : "text-muted-2 hover:text-foreground",
                )}
              >
                <EyeOff className="size-3.5" /> Contains spoilers
              </button>
            </div>

            {/* Attach screenshots */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || images.length >= MAX_IMAGES}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
              {images.length > 0 ? `Screenshots (${images.length}/${MAX_IMAGES})` : "Add screenshots"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onFiles}
            />
          </div>

          <Button type="submit" size="sm" disabled={!body.trim() || score === 0 || uploading}>
            <Sparkles className="size-3.5" /> Post review
          </Button>
        </div>

        <p className="mt-3 flex items-start gap-2 border-t border-border-soft pt-3 text-sm font-semibold leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-safe" />
          <span>
            Mark whether your review contains spoilers, and please be mindful, don&apos;t reveal key moments or
            endings for fans who haven&apos;t caught up yet. Keep Watchruum spoiler-safe.
          </span>
        </p>
      </form>

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white/[0.02] p-6 text-center text-sm text-muted-2">
          No reviews yet. Be the first to review {media.title}.
        </p>
      ) : (
        <>
          {/* First three reviews */}
          <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
            {sortByKey(reviews, sort)
              .slice(0, 3)
              .map((r) => (
                <ReviewItem key={r.id} review={r} viewerLang={viewerLang} />
              ))}
          </div>

          {/* Summary bar → opens the full reviews drawer */}
          <div className="glass mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-4 text-[13px]">
              <span className="font-semibold">
                <span className="text-primary">{compact(totalReviews)}</span> Reviews
              </span>
              <span className="flex items-center gap-1.5 text-muted-2">
                <Heart className="size-4" /> {compact(totalLikes)}
              </span>
              <span className="flex items-center gap-1.5 text-muted-2">
                <MessageCircle className="size-4" /> {compact(totalComments)}
              </span>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary transition hover:brightness-110"
            >
              View all reviews <ArrowRight className="size-4" />
            </button>
          </div>
        </>
      )}

      <AllReviewsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        media={media}
        reviews={reviews}
        sort={sort}
        setSort={setSort}
        total={totalReviews}
        viewerLang={viewerLang}
        onPost={addReview}
      />
    </section>
  );
}

function AllReviewsDrawer({
  open,
  onClose,
  media,
  reviews,
  sort,
  setSort,
  total,
  viewerLang,
  onPost,
}: {
  open: boolean;
  onClose: () => void;
  media: MediaItem;
  reviews: DisplayReview[];
  sort: SortKey;
  setSort: (k: SortKey) => void;
  total: number;
  viewerLang: string | null;
  onPost: (score: number, text: string, spoilers: boolean, imgs: string[]) => void;
}) {
  const [score, setScore] = useState(0);
  const [text, setText] = useState("");

  // While docked open, mark the shell so it reserves the panel's width and
  // reflows the page beside it (see .reviews-open in globals.css). The left
  // region and the panel then scroll independently. Also close on Escape.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("reviews-open");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("reviews-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Render into <body> so the panel is anchored to the viewport — not to the
  // reflowed #main-col (whose backdrop-blur/glass ancestors would otherwise
  // become the fixed containing block and drag the panel left with the margin).
  if (!open || typeof document === "undefined") return null;

  const TABS: { key: SortKey; label: string }[] = [
    { key: "liked", label: "Top" },
    { key: "newest", label: "Newest" },
    { key: "oldest", label: "Oldest" },
  ];

  function post(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || score === 0) return;
    onPost(score, text.trim(), false, []);
    setScore(0);
    setText("");
  }

  return createPortal(
    <div className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-border bg-bg shadow-2xl sm:w-[420px]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
          <h3 className="text-base font-bold">
            All reviews <span className="text-muted-2">({compact(total)})</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-muted-2 transition hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSort(t.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                sort === t.key ? "bg-primary text-white" : "text-muted-2 hover:bg-white/5 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable feed */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {sortByKey(reviews, sort).map((r) => (
            <ReviewItem key={r.id} review={r} viewerLang={viewerLang} />
          ))}
        </div>

        {/* Composer */}
        <form onSubmit={post} className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-2">Your rating</span>
            <StarRating value={score} onChange={setScore} />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Review ${media.title}…`}
              aria-label="Write a review"
              className="min-w-0 flex-1 rounded-full border border-border bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-foreground outline-none transition placeholder:text-muted-2 focus:border-primary/50"
            />
            <button
              type="submit"
              disabled={!text.trim() || score === 0}
              aria-label="Post review"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:brightness-110 disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </div>
        </form>
    </div>,
    document.body,
  );
}

const REPORT_REASONS = [
  "Contains an unmarked spoiler",
  "Harassment or hate speech",
  "Spam or advertising",
  "Off-topic or irrelevant",
  "Other",
];

/** Report control with a reason picker and an Undo (withdraw) action. */
function ReportControl({ targetId, demo }: { targetId: string; demo: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [other, setOther] = useState("");
  const [reported, setReported] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const text = reason === "Other" ? other.trim() || "Other" : reason;
    setErr(null);
    setOpen(false);
    if (demo) {
      setReported(true);
      return;
    }
    start(async () => {
      const res = await reportContent("review", targetId, text);
      if (res.ok) setReported(true);
      else setErr(res.error ?? "Couldn't submit that report.");
    });
  }

  function undo() {
    setErr(null);
    if (demo) {
      setReported(false);
      return;
    }
    start(async () => {
      const res = await unreportContent("review", targetId);
      if (res.ok) setReported(false);
      else setErr(res.error ?? "Couldn't undo that.");
    });
  }

  if (reported) {
    return (
      <span className="relative ml-auto flex items-center gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1 font-semibold text-warn">
          <Flag className="size-3.5" /> Reported
        </span>
        <button onClick={undo} disabled={pending} className="font-semibold text-primary hover:underline disabled:opacity-60">
          {pending ? "…" : "Undo"}
        </button>
        {err && <span className="absolute right-0 top-full mt-1 whitespace-nowrap text-[11px] text-danger">{err}</span>}
      </span>
    );
  }

  return (
    <div className="relative ml-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn("flex items-center gap-1.5 text-[12px] text-muted-2 transition-colors hover:text-warn", open && "text-warn")}
      >
        <Flag className="size-3.5" /> Report
      </button>
      {open && (
        <>
          <button aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-xl border border-border bg-bg-elevated p-3 shadow-2xl">
            <p className="mb-2 text-[12px] font-semibold">Why are you reporting this?</p>
            <div className="space-y-1">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors",
                    reason === r ? "bg-primary/10 text-foreground" : "text-muted hover:bg-white/5",
                  )}
                >
                  <span className={cn("grid size-3.5 shrink-0 place-items-center rounded-full border", reason === r ? "border-primary" : "border-muted-2")}>
                    {reason === r && <span className="size-1.5 rounded-full bg-primary" />}
                  </span>
                  {r}
                </button>
              ))}
            </div>
            {reason === "Other" && (
              <textarea
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="Tell us more (optional)"
                aria-label="Additional details"
                rows={2}
                className="mt-2 w-full resize-none rounded-lg border border-border bg-white/[0.03] px-2.5 py-2 text-[12.5px] outline-none placeholder:text-muted-2 focus:border-primary/50"
              />
            )}
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-warn px-3 py-1.5 text-[12px] font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Flag className="size-3.5" />} Submit report
              </button>
            </div>
          </div>
        </>
      )}
      {err && <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-[11px] text-danger">{err}</p>}
    </div>
  );
}

function ReviewItem({ review, viewerLang }: { review: DisplayReview; viewerLang: string | null }) {
  const demo = !!review.demo;
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(review.liked_by_me);
  const [likes, setLikes] = useState(review.like_count);
  const [, start] = useTransition();

  // Replies
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<ReviewComment[] | null>(demo ? review.replies ?? [] : null);
  const [count, setCount] = useState(review.comment_count);
  const [loading, setLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);

  function toggleReplies() {
    const next = !open;
    setOpen(next);
    // Lazy-load the real thread the first time it's opened.
    if (next && !demo && comments === null && !loading) {
      setLoading(true);
      loadReviewComments(review.id)
        .then((rows) => setComments(rows))
        .catch(() => setComments([]))
        .finally(() => setLoading(false));
    }
  }

  function submitReply(e: React.FormEvent) {
    e.preventDefault();
    const text = replyBody.trim();
    if (!text) return;
    const optimistic: ReviewComment = {
      id: `local_${Date.now()}`,
      author_name: "You",
      author_avatar: null,
      body: text,
      created_at: new Date().toISOString(),
    };
    setComments((c) => [...(c ?? []), optimistic]);
    setCount((n) => n + 1);
    setReplyBody("");
    if (demo) return; // placeholder card — stay optimistic, never hit the DB
    setPosting(true);
    start(async () => {
      await postReviewComment(review.id, text);
      setPosting(false);
    });
  }

  const spoiler = review.spoiler_scope !== "none";
  const hidden = spoiler && !revealed;
  const images = review.image_urls ?? [];

  function like() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    if (demo) return; // placeholder card — optimistic only
    start(() => {
      toggleReaction("review", review.id, next);
    });
  }

  return (
    <div className="glass mb-3 break-inside-avoid rounded-2xl p-4">
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

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {spoiler ? (
          <Badge variant="warn">Contains Spoilers</Badge>
        ) : (
          <Badge variant="safe">Spoiler-Free</Badge>
        )}
        {images.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-2">
            <ImagePlus className="size-3" /> {images.length}
          </span>
        )}
      </div>

      {hidden ? (
        <div className="relative mt-3 overflow-hidden rounded-xl border border-warn/25">
          {/* Blurred body behind the overlay */}
          <p className="select-none px-3 py-4 text-sm leading-relaxed text-foreground/90 blur-[6px]" aria-hidden>
            {review.body || "This review contains spoilers for people who haven't watched yet."}
          </p>
          <div className="absolute inset-0 grid place-items-center bg-bg/50 backdrop-blur-[2px]">
            <div className="text-center">
              <p className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-warn">
                <EyeOff className="size-4" /> This contains a spoiler
                {images.length > 0 && " + screenshots"}
              </p>
              <button
                onClick={() => setRevealed(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110"
              >
                <Eye className="size-3.5" /> Unlock
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <TranslatableText
            text={review.body}
            sourceLang={review.lang}
            targetLang={viewerLang}
            contentType="review"
            contentId={review.id}
            className="mt-3 text-sm leading-relaxed text-foreground/90"
          />
          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((u, i) => (
                <a
                  key={i}
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-24 w-32 overflow-hidden rounded-lg ring-1 ring-border transition hover:ring-primary/50"
                >
                  <img src={u} alt={`Review screenshot ${i + 1}`} className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-2">
        <button
          onClick={like}
          className={cn("flex items-center gap-1.5 transition-colors hover:text-foreground", liked && "text-danger")}
        >
          <Heart className={cn("size-3.5", liked && "fill-danger")} /> {likes}
        </button>
        <button
          onClick={toggleReplies}
          aria-expanded={open}
          className={cn("flex items-center gap-1.5 transition-colors hover:text-foreground", open && "text-primary")}
        >
          <MessageCircle className="size-3.5" /> {count}
        </button>
        <ReportControl targetId={review.id} demo={demo} />
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border-soft pt-3">
          {loading ? (
            <p className="flex items-center gap-2 text-[12px] text-muted-2">
              <Loader2 className="size-3.5 animate-spin" /> Loading replies…
            </p>
          ) : comments && comments.length > 0 ? (
            comments.map((cm) => (
              <div key={cm.id} className="flex items-start gap-2.5">
                <Avatar name={cm.author_name} src={cm.author_avatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{cm.author_name}</span>
                    <span className="text-[11px] text-muted-2">{timeAgo(cm.created_at)}</span>
                  </p>
                  <p className="text-[13px] leading-relaxed text-foreground/90">{cm.body}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-muted-2">No replies yet. Start the conversation.</p>
          )}

          <form onSubmit={submitReply} className="flex items-center gap-2">
            <input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              aria-label="Write a reply"
              className="min-w-0 flex-1 rounded-full border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] text-foreground outline-none transition placeholder:text-muted-2 focus:border-primary/50"
            />
            <button
              type="submit"
              disabled={!replyBody.trim() || posting}
              aria-label="Post reply"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
