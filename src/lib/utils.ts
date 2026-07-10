import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Relative "2m ago" / "3h ago" formatting. */
export function timeAgo(input: string | number | Date): string {
  const date = new Date(input);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const table: [number, string][] = [
    [60, "s"],
    [3600, "m"],
    [86400, "h"],
    [604800, "d"],
    [2629800, "w"],
  ];
  if (seconds < 60) return "just now";
  for (let i = 1; i < table.length; i++) {
    if (seconds < table[i][0]) {
      const unit = table[i - 1][0];
      return `${Math.floor(seconds / unit)}${table[i][1]} ago`;
    }
  }
  return `${Math.floor(seconds / 2629800)}mo ago`;
}

/** 1234 -> "1.2K" */
export function compact(n: number): string {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Deterministic gradient poster from a title string (no copyrighted art). */
export function posterGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const h2 = (h + 55) % 360;
  return `linear-gradient(150deg, hsl(${h} 60% 22%), hsl(${h2} 55% 12%))`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** URL-friendly slug from a title: "The Odyssey" -> "the-odyssey". */
export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * Public route id for a title, e.g. "the-odyssey-movie-1339713".
 * The trailing "-{type}-{id}" is what the app parses; the leading slug is
 * cosmetic, so URLs read like a real product instead of exposing a data source.
 */
export function routeId(type: "movie" | "tv", tmdbId: number, title: string): string {
  const slug = slugify(title);
  return slug ? `${slug}-${type}-${tmdbId}` : `${type}-${tmdbId}`;
}
