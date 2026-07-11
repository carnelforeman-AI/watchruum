import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { trending } from "@/lib/tmdb";

// Refresh the sitemap once a day.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/trending`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/rooms`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/genres`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/calendar`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];

  // Popular titles, so individual show/movie pages get discovered and indexed.
  let titleRoutes: MetadataRoute.Sitemap = [];
  try {
    const media = await trending();
    titleRoutes = media.slice(0, 60).map((m) => ({
      url: `${SITE_URL}/title/${m.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // If TMDb is unreachable at build time, ship the static routes anyway.
  }

  return [...staticRoutes, ...titleRoutes];
}
