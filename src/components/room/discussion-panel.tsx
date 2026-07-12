"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MessagesSquare, Plus, X, Loader2, CornerDownRight, Lock, Eye, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn, timeAgo } from "@/lib/utils";
import { evaluateSpoiler, spoilerMeta, isHidden } from "@/lib/spoiler";
import type { MediaItem, SpoilerScope } from "@/lib/types";
import type { ViewerProgress } from "@/lib/spoiler";
import type { RoomThread, ThreadReply } from "@/lib/room-tabs";
import { createThread, postThreadReply } from "@/app/room-actions";

interface Ctx {
  media: MediaItem;
  season: number | null;
  episode: number | null;
  isMovie: boolean;
  safeLabel: string;
  viewerId: string | null;
  viewerName: string | null;
  progress: ViewerProgress | null;
}

const TV_SCOPES: { value: SpoilerScope; label: string }[] = [
  { value: "none", label: "No spoilers" },
  { value: "episode", label: "This episode" },
  { value: "season", label: "Season" },
  { value: "series", label: "Whole series" },
];
const MOVIE_SCOPES: { value: SpoilerScope; label: string }[] = [
  { value: "none", label: "No spoilers" },
  { value: "series", label: "Spoilers" },
];

export function DiscussionPanel({ ctx, initialThreads }: { ctx: Ctx; initialThreads: RoomThread[] }) {
  const [threads, setThreads] = useState<RoomThread[]>(initialThreads);
  const [composing, setComposing] = useState(false);
  const signedIn = !!ctx.viewerId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <MessagesSquare className="size-5 text-primary" /> Discussion
          </h2>
          <p className="text-[12.5px] text-muted-2">Deeper threads and theories — the conversations people come back to.</p>
        </div>
        {signedIn && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-3.5 py-2 text-[13px] font-semibold text-white hover:brightness-110"
          >
            <Plus className="size-4" /> New thread
          </button>
        )}
      </div>

      {composing && (
        <ThreadComposer ctx={ctx} onCreated={(t) => { setThreads((p) => [t, ...p]); setComposing(false); }} onCancel={() => setComposing(false)} />
      )}

      {threads.length === 0 && !composing ? (
        <EmptyState signedIn={signedIn} onCompose={() => setComposing(true)} />
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <ThreadCard
              key={t.id}
              thread={t}
              ctx={ctx}
              onReply={(reply) => setThreads((all) => all.map((x) => (x.id === t.id ? { ...x, replies: [...x.replies, reply] } : x)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadCard({ thread, ctx, onReply }: { thread: RoomThread; ctx: Ctx; onReply: (r: ThreadReply) => void }) {
  const state = evaluateSpoiler(
    { spoiler_scope: thread.spoiler_scope, season_number: thread.season_number, episode_number: thread.episode_number },
    ctx.progress,
    ctx.isMovie,
  );
  const meta = spoilerMeta(state);
  const hidden = isHidden(state);
  const [revealed, setRevealed] = useState(!hidden);
  const [open, setOpen] = useState(false);

  if (hidden && !revealed) {
    return (
      <div className="glass rounded-2xl border border-warn/20 p-5">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-warn" />
          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${meta.color}22`, color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <p className="mt-2 text-[14px] font-semibold">Hidden thread</p>
        <p className="mt-0.5 text-[12.5px] text-muted-2">
          This thread discusses content past where you are. {meta.copy}
        </p>
        <button
          onClick={() => setRevealed(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.03] px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-foreground"
        >
          <Eye className="size-3.5" /> Reveal anyway
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${meta.color}22`, color: meta.color }}>
          {meta.label}
        </span>
      </div>
      <h3 className="text-[16px] font-bold leading-snug">{thread.title}</h3>
      <p className={cn("mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-muted", !open && "line-clamp-3")}>{thread.body}</p>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11.5px] text-muted-2">
        <span className="flex items-center gap-1.5">
          <Avatar name={thread.author.display_name} src={thread.author.avatar_url} size="sm" className="size-5" />
          <Link href={`/u/${thread.author.username}`} className="font-medium hover:underline">
            {thread.author.display_name}
          </Link>
          · {timeAgo(thread.created_at)}
        </span>
        <button onClick={() => setOpen((o) => !o)} className="font-semibold text-primary hover:underline">
          {thread.replies.length} {thread.replies.length === 1 ? "reply" : "replies"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {thread.replies.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              <CornerDownRight className="mt-1 size-3.5 shrink-0 text-muted-2" />
              <div className="min-w-0">
                <p className="text-[12px] text-muted-2">
                  <Link href={`/u/${r.author.username}`} className="font-semibold text-foreground hover:underline">
                    {r.author.display_name}
                  </Link>{" "}
                  · {timeAgo(r.created_at)}
                </p>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{r.body}</p>
              </div>
            </div>
          ))}
          {ctx.viewerId ? (
            <ReplyBox threadId={thread.id} ctx={ctx} onReply={onReply} />
          ) : (
            <p className="text-[12.5px] text-muted-2">
              <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to join the thread.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReplyBox({ threadId, ctx, onReply }: { threadId: string; ctx: Ctx; onReply: (r: ThreadReply) => void }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    onReply({
      id: `local-${Date.now()}`,
      body: text,
      created_at: new Date().toISOString(),
      author: { id: ctx.viewerId ?? "", username: "you", display_name: ctx.viewerName ?? "You", avatar_url: null },
    });
    start(async () => {
      await postThreadReply(threadId, text);
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a reply…"
        className="h-9 min-w-0 flex-1 rounded-full border border-border bg-white/[0.03] px-3.5 text-[13px] outline-none focus:border-primary/60"
      />
      <button type="submit" disabled={!body.trim() || pending} aria-label="Reply" className="grid size-9 shrink-0 place-items-center rounded-full text-primary hover:bg-primary/15 disabled:opacity-40">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      </button>
    </form>
  );
}

function ThreadComposer({ ctx, onCreated, onCancel }: { ctx: Ctx; onCreated: (t: RoomThread) => void; onCancel: () => void }) {
  const scopes = ctx.isMovie ? MOVIE_SCOPES : TV_SCOPES;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<SpoilerScope>(ctx.isMovie ? "none" : "episode");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const t = title.trim();
    const b = body.trim();
    if (!t) return setError("Give your thread a title.");
    if (!b) return setError("Add some detail.");
    start(async () => {
      const res = await createThread(ctx.media, ctx.season, ctx.episode, t, b, scope);
      if (!res.ok && !res.demo) return setError(res.error ?? "Couldn't post the thread.");
      onCreated({
        id: res.id ?? `local-${Date.now()}`,
        title: t,
        body: b,
        spoiler_scope: scope,
        season_number: ctx.season,
        episode_number: ctx.episode,
        created_at: new Date().toISOString(),
        author: { id: ctx.viewerId ?? "", username: "you", display_name: ctx.viewerName ?? "You", avatar_url: null },
        replies: [],
      });
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">New discussion thread</h3>
        <button onClick={onCancel} aria-label="Cancel" className="grid size-7 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thread title — a theory, a question, a breakdown…"
        className="mb-2 w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-primary/60"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Lay out your thoughts…"
        className="w-full resize-y rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-primary/60"
      />
      <div className="mt-3">
        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-2">Spoiler level</p>
        <div className="flex flex-wrap gap-1.5">
          {scopes.map((s) => (
            <button
              key={s.value}
              onClick={() => setScope(s.value)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                scope === s.value ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-2 hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-2 text-[12.5px] font-medium text-danger">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <MessagesSquare className="size-4" />} Post thread
        </button>
        <button onClick={onCancel} className="rounded-xl px-3 py-2 text-[13px] font-semibold text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

function EmptyState({ signedIn, onCompose }: { signedIn: boolean; onCompose: () => void }) {
  return (
    <div className="glass grid place-items-center rounded-2xl py-14 text-center">
      <MessagesSquare className="mb-2 size-8 text-muted-2" />
      <p className="font-semibold">No threads yet</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted-2">Start the first deep-dive — a theory, a character breakdown, or a question for the room.</p>
      {signedIn ? (
        <button onClick={onCompose} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-strong">
          <Plus className="size-4" /> Start a thread
        </button>
      ) : (
        <Link href="/login" className="mt-4 text-[13px] font-semibold text-primary hover:underline">
          Sign in to start a thread
        </Link>
      )}
    </div>
  );
}
