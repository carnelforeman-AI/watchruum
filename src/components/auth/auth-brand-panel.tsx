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

      {/* Brand mark */}
      <div className="relative flex items-center gap-3">
        <span className="relative grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_10px_28px_-10px_rgba(124,58,237,0.9)]">
          <svg viewBox="0 0 24 24" className="size-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="text-2xl font-extrabold tracking-tight">
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
