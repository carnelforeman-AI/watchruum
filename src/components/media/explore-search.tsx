"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const FILTERS = ["TV Shows", "Movies", "Trending", "New", "Most Active", "Spoiler-Safe"];

export function ExploreSearch({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [active, setActive] = useState("Trending");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : "/explore");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute left-4 top-3.5 size-5 text-muted-2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shows, movies, episodes…"
          className="h-12 w-full rounded-2xl border border-border bg-white/5 pl-12 pr-4 text-[15px] placeholder:text-muted-2 focus-visible:border-primary/60 focus-visible:outline-none"
        />
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors " +
              (active === f
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "border-border bg-white/5 text-muted hover:text-foreground")
            }
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
