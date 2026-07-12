"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BarChart3, Plus, X, Check, Loader2, Vote } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn, timeAgo } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";
import type { RoomPoll } from "@/lib/room-tabs";
import { createPoll, votePoll } from "@/app/room-actions";

interface Ctx {
  media: MediaItem;
  season: number | null;
  episode: number | null;
  viewerId: string | null;
  viewerName: string | null;
}

export function PollsPanel({ ctx, initialPolls }: { ctx: Ctx; initialPolls: RoomPoll[] }) {
  const [polls, setPolls] = useState<RoomPoll[]>(initialPolls);
  const [composing, setComposing] = useState(false);
  const signedIn = !!ctx.viewerId;

  function onCreated(poll: RoomPoll) {
    setPolls((p) => [poll, ...p]);
    setComposing(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <BarChart3 className="size-5 text-primary" /> Polls
          </h2>
          <p className="text-[12.5px] text-muted-2">Quick fan votes — ratings, predictions, best scene. Even quiet fans vote.</p>
        </div>
        {signedIn && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-3.5 py-2 text-[13px] font-semibold text-white hover:brightness-110"
          >
            <Plus className="size-4" /> New poll
          </button>
        )}
      </div>

      {composing && <PollComposer ctx={ctx} onCreated={onCreated} onCancel={() => setComposing(false)} />}

      {polls.length === 0 && !composing ? (
        <EmptyState signedIn={signedIn} onCompose={() => setComposing(true)} />
      ) : (
        <div className="space-y-3">
          {polls.map((p) => (
            <PollCard key={p.id} poll={p} signedIn={signedIn} onChange={(np) => setPolls((all) => all.map((x) => (x.id === np.id ? np : x)))} />
          ))}
        </div>
      )}
    </div>
  );
}

function PollCard({ poll, signedIn, onChange }: { poll: RoomPoll; signedIn: boolean; onChange: (p: RoomPoll) => void }) {
  const [pending, start] = useTransition();
  const revealed = poll.myVote !== null; // show results once you've voted

  function vote(idx: number) {
    if (!signedIn || pending || idx === poll.myVote) return;
    const counts = [...poll.counts];
    let total = poll.totalVotes;
    if (poll.myVote !== null) counts[poll.myVote] = Math.max(0, counts[poll.myVote] - 1);
    else total += 1;
    counts[idx] += 1;
    const next: RoomPoll = { ...poll, counts, totalVotes: total, myVote: idx };
    onChange(next);
    start(async () => {
      const res = await votePoll(poll.id, idx);
      if (!res.ok) onChange(poll); // revert
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-[15px] font-bold leading-snug">{poll.question}</p>

      <div className="mt-3 space-y-2">
        {poll.options.map((opt, i) => {
          const count = poll.counts[i] ?? 0;
          const pct = poll.totalVotes ? Math.round((count / poll.totalVotes) * 100) : 0;
          const mine = poll.myVote === i;
          return (
            <button
              key={i}
              type="button"
              disabled={!signedIn || pending}
              onClick={() => vote(i)}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                mine ? "border-primary/60" : "border-border hover:border-primary/40",
                !signedIn && "cursor-default",
              )}
            >
              {revealed && (
                <span
                  className={cn("absolute inset-y-0 left-0 rounded-l-xl", mine ? "bg-primary/25" : "bg-white/[0.06]")}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[13.5px] font-medium">
                  {mine && <Check className="size-4 text-primary" />}
                  {opt}
                </span>
                {revealed && <span className="text-[12px] font-semibold text-muted-2">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[11.5px] text-muted-2">
        <span className="flex items-center gap-1.5">
          <Avatar name={poll.author.display_name} src={poll.author.avatar_url} size="sm" className="size-5" />
          <Link href={`/u/${poll.author.username}`} className="font-medium hover:underline">
            {poll.author.display_name}
          </Link>
          · {timeAgo(poll.created_at)}
        </span>
        <span className="flex items-center gap-1">
          {pending && <Loader2 className="size-3 animate-spin" />}
          {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
          {!signedIn && " · sign in to vote"}
        </span>
      </div>
    </div>
  );
}

function PollComposer({ ctx, onCreated, onCancel }: { ctx: Ctx; onCreated: (p: RoomPoll) => void; onCancel: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function setOpt(i: number, v: string) {
    setOptions((o) => o.map((x, idx) => (idx === i ? v : x)));
  }

  function submit() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q) return setError("Add a question.");
    if (opts.length < 2) return setError("Add at least two options.");
    start(async () => {
      const res = await createPoll(ctx.media, ctx.season, ctx.episode, q, opts);
      if (!res.ok && !res.demo) return setError(res.error ?? "Couldn't create the poll.");
      onCreated({
        id: res.id ?? `local-${Date.now()}`,
        question: q,
        options: opts,
        created_at: new Date().toISOString(),
        author: { id: ctx.viewerId ?? "", username: "you", display_name: ctx.viewerName ?? "You", avatar_url: null },
        counts: new Array(opts.length).fill(0),
        totalVotes: 0,
        myVote: null,
      });
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">New poll</h3>
        <button onClick={onCancel} aria-label="Cancel" className="grid size-7 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask the room… (e.g. Rate this episode 1–10)"
        className="mb-2 w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
      />
      <div className="space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={o}
              onChange={(e) => setOpt(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="w-full rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-[13.5px] outline-none focus:border-primary/60"
            />
            {options.length > 2 && (
              <button onClick={() => setOptions((os) => os.filter((_, idx) => idx !== i))} aria-label="Remove option" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-2 hover:text-danger">
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {options.length < 6 && (
        <button onClick={() => setOptions((o) => [...o, ""])} className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline">
          <Plus className="size-3.5" /> Add option
        </button>
      )}
      {error && <p className="mt-2 text-[12.5px] font-medium text-danger">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Vote className="size-4" />} Post poll
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
      <BarChart3 className="mb-2 size-8 text-muted-2" />
      <p className="font-semibold">No polls yet</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted-2">Start a quick vote — rate the episode, pick the MVP, or predict what happens next.</p>
      {signedIn ? (
        <button onClick={onCompose} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-strong">
          <Plus className="size-4" /> Create the first poll
        </button>
      ) : (
        <Link href="/login" className="mt-4 text-[13px] font-semibold text-primary hover:underline">
          Sign in to create a poll
        </Link>
      )}
    </div>
  );
}
