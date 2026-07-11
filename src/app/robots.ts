import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / user-specific surfaces that shouldn't be indexed.
      disallow: ["/admin", "/settings", "/inbox", "/notifications", "/onboarding", "/suspended", "/auth/", "/join/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
