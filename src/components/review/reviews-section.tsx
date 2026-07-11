"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState, useTransition } from "react";
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
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StarRating } from "@/components/media/rating";
import { cn, timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SortSelect, sortByKey, type SortKey } from "@/components/ui/comment-sort";
import { postReview, toggleReaction, reportContent } from "@/app/actions";
import type { MediaItem } from "@/lib/types";
import type { DisplayReview } from "@/lib/queries";

const MAX_IMAGES = 4;
const MAX_IMG_BYTES = 5 * 1024 * 1024; // 5 MB

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
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("liked");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, start] = useTransition();

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || score === 0) return;
    const scope = hasSpoilers ? "series" : "none";
    const imgs = images;
    const optimistic: DisplayReview = {
      id: `local_${Date.now()}`,
      author_name: "You",
      author_avatar: null,
      season_number: null,
      episode_number: null,
      score,
      body: body.trim(),
      spoiler_scope: scope,
      image_urls: imgs,
      like_count: 0,
      liked_by_me: false,
      created_at: new Date().toISOString(),
    };
    setReviews((r) => [optimistic, ...r]);
    setSort("newest"); // surface the just-posted review at the top
    const text = body.trim();
    setScore(0);
    setBody("");
    setHasSpoilers(false);
    setImages([]);
    setUploadErr(null);
    start(() => {
      postReview(media, null, null, optimistic.score, text, scope, imgs);
    });
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

        <p className="mt-3 flex items-start gap-1.5 border-t border-border-soft pt-3 text-[11.5px] leading-relaxed text-muted-2">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-safe" />
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
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {sortByKey(reviews, sort).map((r) => (
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
  const images = review.image_urls ?? [];

  function like() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
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
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.body}</p>
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
