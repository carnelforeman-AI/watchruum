import { Star } from "lucide-react";
import { PosterCollage } from "./poster-collage";
import { getTrendingRooms } from "@/lib/queries";

/**
 * Left marketing panel of the auth split-screen: poster wall + brand,
 * tagline, and a testimonial. Server component — fetches real posters.
 */
export async function AuthBrandPanel() {
  const rooms = await getTrendingRooms(12);
  const media = rooms.map((r) => r.media);

  return (
    <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
      <PosterCollage media={media} />

      {/* Brand wordmark */}
      <div className="relative">
        <span className="text-4xl font-extrabold tracking-tight">
          Watch<span className="brand-gradient">ruum</span>
        </span>
      </div>

      {/* Headline + testimonial */}
      <div className="relative max-w-md">
        <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight">
          Your show. Your room.
          <br />
          No <span className="brand-gradient">spoilers</span> you don&apos;t want.
        </h2>
        <div className="mt-5 h-1 w-14 rounded-full bg-gradient-to-r from-primary to-accent" />
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          Track what you watch, rate every episode, and join spoiler-safe rooms with fans who are
          on the same page as you.
        </p>

        <div className="mt-8">
          <div className="flex gap-1 text-primary">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className={i < 4 ? "size-5 fill-primary" : "size-5 fill-primary/30 text-primary/30"} />
            ))}
          </div>
          <p className="mt-3 text-[15px] font-medium italic text-foreground/90">
            &ldquo;Finally a place to talk about shows without getting spoiled.&rdquo;
          </p>
          <p className="mt-1 text-[13px] text-muted-2">— Verified Watchruumer</p>
        </div>
      </div>
    </div>
  );
}
