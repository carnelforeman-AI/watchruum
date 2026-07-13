"use client";

import { useMemo, useState } from "react";
import { Users, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { LobbyComposer } from "./lobby-composer";
import { LobbyPostCard } from "./lobby-post-card";
import { LobbyRightRail } from "./lobby-right-rail";
import type { LobbyData, LobbyPost } from "@/lib/lobby-types";

type Tab = "forYou" | "following" | "trending" | "latest";
const TABS: { key: Tab; label: string }[] = [
  { key: "forYou", label: "For you" },
  { key: "following", label: "Following" },
  { key: "trending", label: "Trending" },
  { key: "latest", label: "Latest" },
];

export function LobbyView({ data }: { data: LobbyData }) {
  const [posts, setPosts] = useState<LobbyPost[]>(data.posts);
  const [tab, setTab] = useState<Tab>("forYou");
  const following = useMemo(() => new Set(data.followingIds), [data.followingIds]);

  const shown = useMemo(() => {
    const list = [...posts];
    if (tab === "trending") {
      return list.sort(
        (a, b) => b.likeCount + b.repostCount + b.replyCount - (a.likeCount + a.repostCount + a.replyCount),
      );
    }
    if (tab === "following") {
      // We match by author identity; seeded posts have no follow data.
      return list.filter((p) => following.size > 0 && p.author.username && following.has(p.author.username));
    }
    return list; // forYou / latest → chronological (already newest-first)
  }, [posts, tab, following]);

  return (
    <div className="mx-auto max-w-[1100px] px-3 py-5 md:px-5">
      <div className="mb-4 flex items-center gap-2.5">
        <Users className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">The Lobby</h1>
          <p className="text-[13px] text-muted-2">The hub for fans to talk shows, movies, and everything in between.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Feed column */}
        <div className="min-w-0">
          {data.signedIn ? (
            <LobbyComposer me={data.me} demo={!data.live} onPosted={(p) => setPosts((cur) => [p, ...cur])} />
          ) : (
            <div className="glass rounded-2xl p-5 text-center text-[13px] text-muted">
              <a href="/login" className="font-semibold text-primary hover:underline">Sign in</a> to join the conversation.
            </div>
          )}

          {/* Tabs */}
          <div className="mt-4 flex items-center gap-6 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px border-b-2 pb-2.5 text-[14px] font-semibold transition-colors",
                  tab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
            <SlidersHorizontal className="ml-auto size-4 text-muted-2" />
          </div>

          {/* Feed */}
          <div className="mt-4 space-y-4">
            {!data.live && (
              <p className="rounded-xl border border-warn/25 bg-warn/[0.06] px-3 py-2 text-[12px] font-medium text-warn">
                Preview: these are sample posts. The Lobby fills with real conversations once you go live.
              </p>
            )}
            {shown.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <p className="font-semibold">
                  {tab === "following" ? "No posts from people you follow yet" : "Nothing here yet"}
                </p>
                <p className="mt-1 text-[13px] text-muted-2">
                  {tab === "following" ? "Follow some fans to see their posts here." : "Be the first to post something."}
                </p>
              </div>
            ) : (
              shown.map((p) => <LobbyPostCard key={p.id} post={p} me={data.me} demo={!data.live} />)
            )}
          </div>
        </div>

        {/* Right rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <LobbyRightRail trends={data.trends} suggestions={data.suggestions} />
          </div>
        </aside>
      </div>
    </div>
  );
}
