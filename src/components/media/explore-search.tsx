"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const FILTERS: { label: string; key: string }[] = [
  { label: "TV Shows", key: "tv" },
  { label: "Movies", key: "movies" },
  { label: "Trending", key: "trending" },
  { label: "New", key: "new" },
  { label: "Most Active", key: "active" },
  { label: "Spoiler-Safe", key: "safe" },
];

export function ExploreSearch({
  initial = "",
  activeFilter = "trending",
}: {
  initial?: string;
  activeFilter?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function urlFor(filter: string) {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (filter && filter !== "trending") p.set("filter", filter);
    const s = p.toString();
    return s ? `/explore?${s}` : "/explore";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(urlFor(activeFilter));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute left-4 top-3.5 size-5 text-muted-2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search"
          placeholder="Search shows, movies, episodes…"
          className="h-12 w-full rounded-2xl border border-border bg-white/5 pl-12 pr-4 text-[15px] placeholder:text-muted-2 focus-visible:border-primary/60 focus-visible:outline-none"
        />
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => router.push(urlFor(f.key))}
            className={
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors " +
              (activeFilter === f.key
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "border-border bg-white/5 text-muted hover:text-foreground")
            }
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
