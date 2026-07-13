/**
 * Central site config for SEO/metadata. The canonical URL comes from
 * NEXT_PUBLIC_SITE_URL, but falls back to the production domain so builds and
 * previews never emit `localhost` canonical/OG links. Set NEXT_PUBLIC_SITE_URL
 * in Vercel to override (e.g. the .vercel.app URL) if the domain isn't live yet.
 */
const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
export const SITE_URL = raw && !raw.includes("localhost") ? raw : "https://www.watchruum.com";

export const SITE_NAME = "Watchruum";
export const SITE_TAGLINE = "Never get spoiled again";
export const SITE_DESCRIPTION =
  "Track what you watch, discuss your favorite shows and movies, rate episodes, and connect with fans.";

export const SITE_KEYWORDS = [
  "spoiler-safe",
  "spoiler protection",
  "TV show discussion",
  "movie discussion",
  "episode tracker",
  "watch tracker",
  "TV social network",
  "fan community",
  "rate episodes",
  "watch rooms",
  "Watchruum",
];

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
