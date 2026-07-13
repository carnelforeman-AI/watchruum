"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Radio, MoreHorizontal, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Poster } from "@/components/media/poster";
import { cn } from "@/lib/utils";
import { toggleFollow } from "@/app/actions";
import type { LobbyTrend, LobbySuggestion } from "@/lib/lobby-types";

function compact(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function LobbyRightRail({ trends, suggestions }: { trends: LobbyTrend[]; suggestions: LobbySuggestion[] }) {
  return (
    <div className="space-y-4">
      {/* What's happening */}
      <section className="glass rounded-2xl p-4">
        <h2 className="mb-3 text-lg font-extrabold">What&apos;s happening</h2>
        <div className="space-y-1">
          {trends.map((t) => (
            <div key={t.label} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
              <Poster title={t.label} src={t.poster} genres={[]} showTitle={false} rounded="rounded-md" className="h-11 w-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-2">{t.category}</p>
                <p className="truncate text-[14px] font-bold">{t.label}</p>
                <p className="text-[11px] text-muted-2">{compact(t.posts)} posts</p>
              </div>
              <MoreHorizontal className="size-4 shrink-0 text-muted-2" />
            </div>
          ))}
        </div>
        <Link href="/trending" className="mt-1 block rounded-lg p-2 text-[13px] font-semibold text-primary hover:bg-white/5">
          Show more
        </Link>
      </section>

      {/* Who to follow */}
      <section className="glass rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Who to follow</h2>
          <Link href="/friends" className="text-[12.5px] font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="space-y-1">
          {suggestions.map((s) => (
            <SuggestionRow key={s.username} s={s} />
          ))}
        </div>
      </section>

      {/* Live in Watchruum */}
      <section className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Live in Watchruum</h2>
          <Link href="/rooms" className="text-[12.5px] font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <Link href="/rooms" className="block rounded-xl border border-border bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
              <Radio className="size-3" /> Live
            </span>
            <span className="text-[13px] font-bold">Watch party</span>
          </div>
          <p className="mt-1.5 text-[12px] text-muted">Fans are hanging out in watch rooms right now. Jump in.</p>
        </Link>
      </section>
    </div>
  );
}

function SuggestionRow({ s }: { s: LobbySuggestion }) {
  const [following, setFollowing] = useState(false);
  const [pending, start] = useTransition();

  const follow = () => {
    if (!s.id) return; // seeded suggestion: the chip links to the profile instead
    const next = !following;
    setFollowing(next);
    start(async () => {
      const res = await toggleFollow(s.id!, next);
      if (!res.ok) setFollowing(!next);
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
      <Link href={`/u/${s.username}`}>
        <Avatar name={s.display_name} src={s.avatar_url} className="size-10 shrink-0" />
      </Link>
      <Link href={`/u/${s.username}`} className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold">{s.display_name}</p>
        <p className="truncate text-[12px] text-muted-2">@{s.username}</p>
      </Link>
      {s.id ? (
        <button
          onClick={follow}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-[13px] font-bold transition disabled:opacity-60",
            following ? "border border-border text-muted hover:text-foreground" : "bg-primary text-white hover:brightness-110",
          )}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : following ? "Following" : "Follow"}
        </button>
      ) : (
        <Link href={`/u/${s.username}`} className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-bold text-white transition hover:brightness-110">
          Follow
        </Link>
      )}
    </div>
  );
}
