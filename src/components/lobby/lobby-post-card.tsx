"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MessageCircle, Repeat2, Heart, Bookmark, Share, ShieldAlert, Eye } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Poster } from "@/components/media/poster";
import { cn, timeAgo } from "@/lib/utils";
import { toggleLobbyLike, toggleLobbyRepost, toggleLobbyBookmark, getLobbyReplies } from "@/app/(main)/lobby/actions";
import type { LobbyAuthor, LobbyPost } from "@/lib/lobby-types";
import { LobbyComposer } from "./lobby-composer";

function whenLabel(v: string) {
  // Seeded posts carry a relative label ("15m", "now"); real posts carry ISO.
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return timeAgo(v);
  return v;
}

export function LobbyPostCard({ post, me, demo }: { post: LobbyPost; me: LobbyAuthor | null; demo: boolean }) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [reposted, setReposted] = useState(post.reposted);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [revealed, setRevealed] = useState(false);

  const [showReply, setShowReply] = useState(false);
  const [replies, setReplies] = useState<LobbyPost[]>([]);
  const [replyCount, setReplyCount] = useState(post.replyCount);
  const [loadingReplies, startLoad] = useTransition();
  const [, start] = useTransition();

  const isSeed = demo || post.demo;

  const optimistic = (
    on: boolean,
    setOn: (v: boolean) => void,
    setN: (fn: (n: number) => number) => void,
    action: (id: string, on: boolean) => Promise<{ ok: boolean }>,
  ) => {
    setOn(on);
    setN((n) => n + (on ? 1 : -1));
    if (isSeed) return; // seeded posts: visual only
    start(async () => {
      const res = await action(post.id, on);
      if (!res.ok) {
        setOn(!on);
        setN((n) => n + (on ? -1 : 1));
      }
    });
  };

  const openReplies = () => {
    const next = !showReply;
    setShowReply(next);
    if (next && !isSeed && replies.length === 0 && replyCount > 0) {
      startLoad(async () => setReplies(await getLobbyReplies(post.id)));
    }
  };

  const spoilerHidden = post.spoiler && !revealed;

  return (
    <article className="glass glass-hover rounded-2xl p-4">
      <div className="flex gap-3">
        <Link href={`/u/${post.author.username}`} className="shrink-0">
          <Avatar name={post.author.display_name} src={post.author.avatar_url} className="size-10" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[14px]">
            <Link href={`/u/${post.author.username}`} className="font-bold hover:underline">
              {post.author.display_name}
            </Link>
            {post.author.is_tester && (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Superfan
              </span>
            )}
            <span className="text-muted-2">@{post.author.username}</span>
            <span className="text-muted-2">· {whenLabel(post.created_at)}</span>
          </div>

          {/* Body */}
          {post.body && (
            <div className="mt-1">
              {spoilerHidden ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-warn/30 bg-warn/[0.06] px-3 py-3 text-left text-[13px] font-semibold text-warn"
                >
                  <ShieldAlert className="size-4 shrink-0" />
                  Spoiler hidden — tap to reveal
                  <Eye className="ml-auto size-4" />
                </button>
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{post.body}</p>
              )}
            </div>
          )}

          {/* Image */}
          {post.image_url && !spoilerHidden && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt="post" className="mt-2.5 max-h-[420px] w-full rounded-xl border border-border object-cover" />
          )}

          {/* Media chip */}
          {post.media && (
            <Link
              href={`/title/${post.media.id}`}
              className="mt-2.5 flex w-fit items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] p-2 pr-4 transition-colors hover:bg-white/[0.06]"
            >
              <Poster title={post.media.title} src={null} genres={[]} showTitle={false} rounded="rounded-md" className="h-11 w-8" />
              <span>
                <span className="block text-[13px] font-semibold">{post.media.title}</span>
                <span className="text-[11px] text-muted-2">{post.media.type === "movie" ? "Movie" : "Show"}</span>
              </span>
            </Link>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between pr-2 text-muted-2">
            <ActionBtn onClick={openReplies} count={replyCount} label="Reply" hoverColor="hover:text-accent">
              <MessageCircle className="size-[18px]" />
            </ActionBtn>
            <ActionBtn
              onClick={() => optimistic(!reposted, setReposted, setRepostCount, toggleLobbyRepost)}
              count={repostCount}
              label="Repost"
              active={reposted}
              activeColor="text-safe"
              hoverColor="hover:text-safe"
            >
              <Repeat2 className="size-[18px]" />
            </ActionBtn>
            <ActionBtn
              onClick={() => optimistic(!liked, setLiked, setLikeCount, toggleLobbyLike)}
              count={likeCount}
              label="Like"
              active={liked}
              activeColor="text-danger"
              hoverColor="hover:text-danger"
            >
              <Heart className={cn("size-[18px]", liked && "fill-danger")} />
            </ActionBtn>
            <button
              onClick={() => optimistic(!bookmarked, setBookmarked, () => {}, toggleLobbyBookmark)}
              aria-label="Bookmark"
              className={cn("grid size-8 place-items-center rounded-full transition-colors hover:text-primary", bookmarked && "text-primary")}
            >
              <Bookmark className={cn("size-[18px]", bookmarked && "fill-primary")} />
            </button>
            <button aria-label="Share" className="grid size-8 place-items-center rounded-full transition-colors hover:text-primary">
              <Share className="size-[18px]" />
            </button>
          </div>

          {/* Reply thread */}
          {showReply && (
            <div className="mt-3 space-y-3 border-t border-border-soft pt-3">
              <LobbyComposer
                me={me}
                demo={demo}
                compact
                replyTo={post.id}
                placeholder={`Reply to ${post.author.display_name}…`}
                onPosted={(p) => {
                  setReplies((r) => [...r, p]);
                  setReplyCount((n) => n + 1);
                }}
              />
              {loadingReplies && <p className="text-[12px] text-muted-2">Loading replies…</p>}
              {replies.map((r) => (
                <div key={r.id} className="flex gap-2.5 rounded-xl bg-white/[0.02] p-3">
                  <Avatar name={r.author.display_name} src={r.author.avatar_url} className="size-8 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[13px]">
                      <span className="font-bold">{r.author.display_name}</span>
                      <span className="text-muted-2">@{r.author.username} · {whenLabel(r.created_at)}</span>
                    </div>
                    {r.body && <p className="text-[14px] leading-relaxed">{r.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ActionBtn({
  children,
  count,
  label,
  onClick,
  active,
  activeColor,
  hoverColor,
}: {
  children: React.ReactNode;
  count: number;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeColor?: string;
  hoverColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn("group inline-flex items-center gap-1.5 rounded-full py-1 pr-2 text-[13px] transition-colors", hoverColor, active && activeColor)}
    >
      {children}
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
