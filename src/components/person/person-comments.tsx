"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState, useTransition } from "react";
import {
  Heart,
  Eye,
  EyeOff,
  MessageSquare,
  Send,
  ShieldCheck,
  ImagePlus,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn, timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { postPersonComment, toggleReaction } from "@/app/actions";
import type { PersonComment } from "@/lib/queries";

const MAX_IMAGES = 4;
const MAX_IMG_BYTES = 5 * 1024 * 1024; // 5 MB

export function PersonComments({
  personTmdbId,
  personName,
  initial,
}: {
  personTmdbId: number;
  personName: string;
  initial: PersonComment[];
}) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
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
    if (!body.trim()) return;
    const text = body.trim();
    const imgs = images;
    const spoiler = hasSpoiler;
    const optimistic: PersonComment = {
      id: `local_${Date.now()}`,
      author_name: "You",
      author_avatar: null,
      body: text,
      has_spoiler: spoiler,
      image_urls: imgs,
      like_count: 0,
      liked_by_me: false,
      created_at: new Date().toISOString(),
    };
    setComments((c) => [optimistic, ...c]);
    setBody("");
    setHasSpoiler(false);
    setImages([]);
    setUploadErr(null);
    start(() => {
      postPersonComment(personTmdbId, personName, text, spoiler, imgs);
    });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <MessageSquare className="size-5 text-primary" /> Fan talk about {personName}
      </h2>

      {/* Composer */}
      <form onSubmit={submit} className="glass mb-4 rounded-2xl p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Share a thought about ${personName}…`}
        />

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
            <div className="inline-flex rounded-full border border-border bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setHasSpoiler(false)}
                aria-pressed={!hasSpoiler}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  !hasSpoiler ? "bg-safe/15 text-safe" : "text-muted-2 hover:text-foreground",
                )}
              >
                <ShieldCheck className="size-3.5" /> Spoiler-free
              </button>
              <button
                type="button"
                onClick={() => setHasSpoiler(true)}
                aria-pressed={hasSpoiler}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  hasSpoiler ? "bg-warn/15 text-warn" : "text-muted-2 hover:text-foreground",
                )}
              >
                <EyeOff className="size-3.5" /> Contains spoilers
              </button>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || images.length >= MAX_IMAGES}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
              {images.length > 0 ? `Screenshots (${images.length}/${MAX_IMAGES})` : "Add screenshots"}
            </button>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
          </div>

          <Button type="submit" size="sm" disabled={!body.trim() || uploading}>
            <Send className="size-3.5" /> Post
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white/[0.02] p-6 text-center text-sm text-muted-2">
          No comments yet. Start the conversation about {personName}.
        </p>
      ) : (
        <div className="grid gap-3">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </div>
      )}
    </section>
  );
}

function CommentItem({ comment }: { comment: PersonComment }) {
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(comment.liked_by_me);
  const [likes, setLikes] = useState(comment.like_count);
  const [, start] = useTransition();

  const hidden = comment.has_spoiler && !revealed;
  const images = comment.image_urls ?? [];

  function like() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    start(() => {
      toggleReaction("person_comment", comment.id, next);
    });
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={comment.author_name} src={comment.author_avatar} size="sm" />
          <div>
            <p className="text-sm font-semibold">{comment.author_name}</p>
            <p className="text-[11px] text-muted-2">{timeAgo(comment.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-2">
              <ImagePlus className="size-3" /> {images.length}
            </span>
          )}
          {comment.has_spoiler && <Badge variant="warn">Spoiler</Badge>}
        </div>
      </div>

      {hidden ? (
        <div className="relative mt-3 overflow-hidden rounded-xl border border-warn/25">
          <p className="select-none px-3 py-4 text-sm leading-relaxed text-foreground/90 blur-[6px]" aria-hidden>
            {comment.body}
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
                <Eye className="size-3.5" /> Reveal anyway
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{comment.body}</p>
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
                  <img src={u} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
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
      </div>
    </div>
  );
}
