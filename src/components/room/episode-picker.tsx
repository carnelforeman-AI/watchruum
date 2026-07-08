"use client";

import { useRouter } from "next/navigation";

export function EpisodePicker({
  id,
  season,
  current,
  total,
}: {
  id: string;
  season: number;
  current: number;
  total: number;
}) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/title/${id}/season/${season}/episode/${e.target.value}`)}
      className="h-10 rounded-xl border border-border bg-panel px-3 text-[13px] font-semibold text-foreground focus-visible:border-primary/60 focus-visible:outline-none"
      aria-label="Jump to episode"
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <option key={n} value={n}>
          Episode {n}
        </option>
      ))}
    </select>
  );
}
