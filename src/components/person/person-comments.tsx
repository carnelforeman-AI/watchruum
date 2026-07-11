"use client";

import { useState, useTransition } from "react";
import { Heart, Eye, EyeOff, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn, timeAgo } from "@/lib/utils";
import { postPersonComment, toggleReaction } from "@/app/actions";
import type { PersonComment } from "@/lib/queries";

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
  const [, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body.trim();
    const optimistic: PersonComment = {
      id: `local_${Date.now()}`,
      author_name: "You",
      author_avatar: null,
      body: text,
      has_spoiler: hasSpoiler,
      like_count: 0,
      liked_by_me: false,
      created_at: new Date().toISOString(),
    };
    setComments((c) => [optimistic, ...c]);
    const spoiler = hasSpoiler;
    setBody("");
    setHasSpoiler(false);
    start(() => {
      postPersonComment(personTmdbId, personName, text, spoiler);
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
          <Button type="submit" size="sm" disabled={!body.trim()}>
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
        {comment.has_spoiler && <Badge variant="warn">Spoiler</Badge>}
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
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{comment.body}</p>
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
