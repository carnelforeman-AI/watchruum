"use client";

import { ChevronDown } from "lucide-react";

export type SortKey = "liked" | "newest" | "oldest";

/** Sort any like_count + created_at list by the chosen key (returns a copy). */
export function sortByKey<T extends { like_count: number; created_at: string }>(
  items: T[],
  key: SortKey,
): T[] {
  const t = (s: string) => new Date(s).getTime() || 0;
  const arr = [...items];
  if (key === "liked") arr.sort((a, b) => b.like_count - a.like_count || t(b.created_at) - t(a.created_at));
  else if (key === "newest") arr.sort((a, b) => t(b.created_at) - t(a.created_at));
  else arr.sort((a, b) => t(a.created_at) - t(b.created_at));
  return arr;
}

/** Compact "Sort by …" dropdown used across comment sections. */
export function SortSelect({
  value,
  onChange,
  className,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 ${className ?? ""}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="Sort"
        className="appearance-none rounded-xl border border-border bg-white/[0.03] py-2 pl-3 pr-9 text-[13px] font-semibold text-foreground outline-none transition hover:border-primary/50 focus:border-primary/60"
      >
        <option value="liked">Sort by most liked</option>
        <option value="newest">Sort by newest</option>
        <option value="oldest">Sort by oldest</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
    </div>
  );
}
